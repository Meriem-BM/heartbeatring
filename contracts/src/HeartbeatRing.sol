// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ReentrancyGuard} from "openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol";

/**
 * @title HeartbeatRing
 * @notice A liveness-gated mutual stake game combining three on-chain primitives:
 *         - State Machine: Registration -> Active -> Completed
 *         - Time-Based: epoch-driven heartbeat deadlines with a liquidation grace window
 *         - Event-First: minimal on-chain state, rich event emission for off-chain indexing
 *
 * @dev N participants form a circular doubly-linked list (ring). Each deposits a fixed stake.
 *      Every epoch, each participant must call heartbeat(). Missing a heartbeat allows anyone
 *      to liquidate the delinquent. Their stake splits 50/50 to their immediate ring neighbors.
 *      The ring shrinks as members are liquidated. Last survivor(s) claim the pool.
 */
contract HeartbeatRing is ReentrancyGuard {
    // ------------------------------------------------------------
    // ------------------------- Types ----------------------------
    // ------------------------------------------------------------

    enum Phase {
        Registration,
        Active,
        Completed
    }

    struct Participant {
        address next; // clockwise neighbor
        address prev; // counter-clockwise neighbor
        uint128 stake; // current accumulated stake (initial + redistributions)
        uint64 lastBeat; // last epoch in which heartbeat() was called
        bool alive; // false once liquidated or refunded/claimed
    }

    // ------------------------------------------------------------
    // ------------------------- State ----------------------------
    // ------------------------------------------------------------

    uint256 public constant MAX_PARTICIPANTS_LIMIT = 1000;
    uint256 public constant REGISTRATION_WINDOW = 7 days;
    uint256 public constant LIQUIDATION_GRACE_PERIOD = 30;

    Phase public phase;

    address public immutable creator;
    uint256 public immutable stakeAmount; // fixed deposit required to join
    uint256 public immutable epochDuration; // seconds per epoch
    uint256 public immutable minParticipants; // minimum to start the game
    uint256 public immutable maxParticipants; // maximum ring size
    uint256 public immutable liquidationBountyBps; // basis points of liquidated stake paid to caller
    uint256 public immutable registrationDeadline; // timestamp when registration closes

    uint256 public gameStartTime; // block.timestamp when game went Active
    uint256 public ringSize; // current number of alive participants in active/completed ring
    uint256 public totalParticipants; // total who registered (for ring traversal guards)

    address public ringHead; // entry point into the ring
    address public ringTail; // last registrant / current tail in ring

    mapping(address => Participant) public participants;
    mapping(address => uint256) public pendingBounties;

    // ------------------------------------------------------------
    // ---------------------- Events ------------------------------
    // ------------------------------------------------------------

    event Registered(address indexed participant, uint256 position);
    event RegistrationRefunded(address indexed participant, uint256 amount);
    event RingFormed(uint256 participants, uint256 epochDuration);
    event Heartbeat(address indexed participant, uint256 indexed epoch);
    event Liquidated(
        address indexed target,
        address indexed leftBeneficiary,
        address indexed rightBeneficiary,
        uint256 leftShare,
        uint256 rightShare,
        uint256 bounty,
        uint256 epoch
    );
    event RingRelinked(address newLeft, address newRight, uint256 ringSize);
    event GameOver(uint256 survivors, uint256 totalPool);
    event Claimed(address indexed survivor, uint256 amount);
    event BountyAccrued(address indexed liquidator, uint256 amount);
    event BountyWithdrawn(address indexed liquidator, uint256 amount);

    // ------------------------------------------------------------
    // ---------------------- Errors ------------------------------
    // ------------------------------------------------------------

    error WrongPhase(Phase expected, Phase actual);
    error InvalidStakeAmount();
    error InvalidParticipantBounds();
    error MaxParticipantsTooHigh();
    error InvalidBountyBps();
    error InvalidEpochDuration();
    error StakeOverflow();
    error AlreadyRegistered();
    error IncorrectStake();
    error RingIsFull();
    error RingNotReady();
    error RegistrationClosed();
    error RegistrationStillOpen();
    error AlreadyDead();
    error NotDelinquent();
    error GracePeriodActive();
    error InvalidRecipient();
    error NothingToClaim();
    error NothingToWithdraw();
    error TransferFailed();
    error GameNotOver();
    error EpochOverflow();
    error RingInvariantBroken();

    // ------------------------------------------------------------
    // ---------------------- Modifiers ---------------------------
    // ------------------------------------------------------------

    modifier inPhase(Phase _phase) {
        if (phase != _phase) revert WrongPhase(_phase, phase);
        _;
    }

    // ------------------------------------------------------------
    // ---------------------- Constructor -------------------------
    // ------------------------------------------------------------

    /**
     * @param _stakeAmount      Wei required to join the ring
     * @param _epochDuration    Seconds per epoch (e.g., 3600 = 1 hour)
     * @param _minParticipants  Minimum players to start (>= 3 for meaningful ring)
     * @param _maxParticipants  Cap on ring size
     * @param _bountyBps        Liquidation bounty in basis points (e.g., 100 = 1%)
     */
    constructor(
        uint256 _stakeAmount,
        uint256 _epochDuration,
        uint256 _minParticipants,
        uint256 _maxParticipants,
        uint256 _bountyBps
    ) {
        if (_stakeAmount == 0 || _stakeAmount > type(uint128).max) {
            revert InvalidStakeAmount();
        }
        if (_minParticipants < 3 || _maxParticipants < _minParticipants) revert InvalidParticipantBounds();
        if (_maxParticipants > MAX_PARTICIPANTS_LIMIT) revert MaxParticipantsTooHigh();
        if (_bountyBps > 500) revert InvalidBountyBps(); // max 5%
        if (_epochDuration < 60 || _epochDuration <= LIQUIDATION_GRACE_PERIOD) revert InvalidEpochDuration();
        if (_stakeAmount > type(uint128).max / _maxParticipants) revert StakeOverflow();

        creator = msg.sender;
        stakeAmount = _stakeAmount;
        epochDuration = _epochDuration;
        minParticipants = _minParticipants;
        maxParticipants = _maxParticipants;
        liquidationBountyBps = _bountyBps;
        registrationDeadline = block.timestamp + REGISTRATION_WINDOW;

        phase = Phase.Registration;
    }

    // ------------------------------------------------------------
    // ------------------- External Functions ---------------------
    // ------------------------------------------------------------

    /**
     * @notice Join the ring by depositing the exact stake amount.
     * @dev Participants are stored in insertion order. Ring links are formed on startGame().
     */
    function register() external payable inPhase(Phase.Registration) {
        if (block.timestamp > registrationDeadline) revert RegistrationClosed();
        if (participants[msg.sender].alive) revert AlreadyRegistered();
        if (msg.value != stakeAmount) revert IncorrectStake();
        if (totalParticipants >= maxParticipants) revert RingIsFull();

        participants[msg.sender] =
            Participant({next: address(0), prev: address(0), stake: uint128(msg.value), lastBeat: 0, alive: true});

        // Build a temporary singly-linked list during registration in O(1)
        if (ringHead == address(0)) {
            ringHead = msg.sender;
            ringTail = msg.sender;
        } else {
            participants[ringTail].next = msg.sender;
            participants[msg.sender].prev = ringTail;
            ringTail = msg.sender;
        }

        unchecked {
            totalParticipants++;
        }

        emit Registered(msg.sender, totalParticipants);
    }

    /**
     * @notice Close registration and form the ring. Anyone can call once minParticipants is met.
     * @dev Closes the linked list into a circular doubly-linked list.
     */
    function startGame() external inPhase(Phase.Registration) {
        if (block.timestamp > registrationDeadline) revert RegistrationClosed();
        if (totalParticipants < minParticipants) revert RingNotReady();

        // Close the ring: tail.next = head, head.prev = tail
        participants[ringTail].next = ringHead;
        participants[ringHead].prev = ringTail;

        ringSize = totalParticipants;
        gameStartTime = block.timestamp;
        phase = Phase.Active;

        emit RingFormed(totalParticipants, epochDuration);
    }

    /**
     * @notice Emit a heartbeat for the current epoch. Must be called once per epoch to stay alive.
     */
    function heartbeat() external inPhase(Phase.Active) {
        Participant storage p = participants[msg.sender];
        if (!p.alive) revert AlreadyDead();

        uint256 epoch = currentEpoch();
        if (epoch > type(uint64).max) revert EpochOverflow();
        p.lastBeat = uint64(epoch);

        emit Heartbeat(msg.sender, epoch);
    }

    /**
     * @notice Liquidate a participant who missed the current epoch's heartbeat.
     * @dev Anyone can call this (permissionless). Caller bounty is accrued and withdrawn separately.
     * @param target The address of the delinquent participant
     */
    function liquidate(address target) external inPhase(Phase.Active) {
        Participant storage t = participants[target];
        if (!t.alive) revert AlreadyDead();

        uint256 epoch = currentEpoch();
        if (epoch == 0 || uint256(t.lastBeat) >= epoch) revert NotDelinquent();

        uint256 epochStart = gameStartTime + (epoch * epochDuration);
        if (block.timestamp < epochStart + LIQUIDATION_GRACE_PERIOD) revert GracePeriodActive();

        address leftBeneficiary = t.prev;
        address rightBeneficiary = t.next;

        uint256 totalStake = uint256(t.stake);
        (uint256 bounty, uint256 leftShare, uint256 rightShare) = _computeLiquidationAmounts(totalStake);

        if (leftBeneficiary == rightBeneficiary) {
            uint256 mergedShare = leftShare + rightShare;
            _addStake(leftBeneficiary, mergedShare);
            leftShare = mergedShare;
            rightShare = 0;
        } else {
            _addStake(leftBeneficiary, leftShare);
            _addStake(rightBeneficiary, rightShare);
        }

        // Relink the ring (skip the dead node)
        participants[leftBeneficiary].next = rightBeneficiary;
        participants[rightBeneficiary].prev = leftBeneficiary;

        if (ringHead == target) ringHead = rightBeneficiary;
        if (ringTail == target) ringTail = leftBeneficiary;

        t.alive = false;
        t.stake = 0;
        t.next = address(0);
        t.prev = address(0);

        unchecked {
            ringSize--;
        }

        if (bounty > 0) {
            pendingBounties[msg.sender] += bounty;
            emit BountyAccrued(msg.sender, bounty);
        }

        emit Liquidated(target, leftBeneficiary, rightBeneficiary, leftShare, rightShare, bounty, epoch);
        emit RingRelinked(leftBeneficiary, rightBeneficiary, ringSize);

        if (ringSize <= 1) {
            phase = Phase.Completed;
            emit GameOver(ringSize, address(this).balance);
        }
    }

    /**
     * @notice Survivors claim their accumulated stake from the pool.
     */
    function claim() external nonReentrant {
        _claimTo(msg.sender, payable(msg.sender));
    }

    /**
     * @notice Survivors claim their accumulated stake from the pool to a custom recipient.
     * @dev Implemented so contract participants that cannot receive ETH directly can redirect payout
     *      to a payable recipient and avoid permanent fund lock.
     * @param recipient The payable address that will receive the claimed stake.
     */
    function claimTo(address payable recipient) external nonReentrant {
        _claimTo(msg.sender, recipient);
    }

    /**
     * @notice Withdraw accrued liquidation bounties.
     */
    function withdrawBounty() external nonReentrant {
        _withdrawBountyTo(msg.sender, payable(msg.sender));
    }

    /**
     * @notice Withdraw accrued liquidation bounties to a custom recipient.
     */
    function withdrawBountyTo(address payable recipient) external nonReentrant {
        _withdrawBountyTo(msg.sender, recipient);
    }

    /**
     * @notice Refund your registration stake if registration deadline passed and game never started.
     */
    function refundRegistration() external nonReentrant inPhase(Phase.Registration) {
        _refundRegistrationTo(msg.sender, payable(msg.sender));
    }

    /**
     * @notice Refund your registration stake to a custom recipient.
     */
    function refundRegistrationTo(address payable recipient) external nonReentrant inPhase(Phase.Registration) {
        _refundRegistrationTo(msg.sender, recipient);
    }

    /**
     * @notice Permissionless refund helper after failed registration phase.
     * @dev Sends funds to the participant address to avoid inactive-user fund lock.
     */
    function refundRegistrationFor(address participant) external nonReentrant inPhase(Phase.Registration) {
        _refundRegistrationTo(participant, payable(participant));
    }

    // ------------------------------------------------------------
    // -------------------- Internal Functions --------------------
    // ------------------------------------------------------------

    function _addStake(address who, uint256 amount) internal {
        if (amount == 0) return;

        uint256 updated = uint256(participants[who].stake) + amount;
        if (updated > type(uint128).max) revert StakeOverflow();
        participants[who].stake = uint128(updated);
    }

    function _claimTo(address claimant, address payable recipient) internal {
        if (phase != Phase.Completed) revert GameNotOver();
        if (recipient == address(0)) revert InvalidRecipient();

        Participant storage p = participants[claimant];
        if (!p.alive) revert NothingToClaim();

        uint256 amount = uint256(p.stake);
        if (amount == 0) revert NothingToClaim();

        p.stake = 0;
        p.alive = false;
        p.next = address(0);
        p.prev = address(0);

        if (ringHead == claimant) ringHead = address(0);
        if (ringTail == claimant) ringTail = address(0);
        if (ringSize > 0) {
            unchecked {
                ringSize--;
            }
        }

        emit Claimed(claimant, amount);
        _sendValue(recipient, amount);
    }

    function _withdrawBountyTo(address liquidator, address payable recipient) internal {
        if (recipient == address(0)) revert InvalidRecipient();

        uint256 amount = pendingBounties[liquidator];
        if (amount == 0) revert NothingToWithdraw();

        pendingBounties[liquidator] = 0;
        emit BountyWithdrawn(liquidator, amount);
        _sendValue(recipient, amount);
    }

    function _refundRegistrationTo(address participant, address payable recipient) internal {
        if (block.timestamp <= registrationDeadline) revert RegistrationStillOpen();
        if (recipient == address(0)) revert InvalidRecipient();

        Participant storage p = participants[participant];
        if (!p.alive) revert NothingToClaim();

        uint256 amount = uint256(p.stake);
        if (amount == 0) revert NothingToClaim();

        address prevNode = p.prev;
        address nextNode = p.next;
        _unlinkRegistrationParticipant(participant, prevNode, nextNode);

        p.stake = 0;
        p.alive = false;
        p.next = address(0);
        p.prev = address(0);

        emit RegistrationRefunded(participant, amount);
        _sendValue(recipient, amount);
    }

    function _unlinkRegistrationParticipant(address participant, address prevNode, address nextNode) internal {
        if (prevNode == address(0)) {
            ringHead = nextNode;
        } else {
            participants[prevNode].next = nextNode;
        }

        if (nextNode == address(0)) {
            ringTail = prevNode;
        } else {
            participants[nextNode].prev = prevNode;
        }

        if (ringHead == participant) ringHead = nextNode;
        if (ringTail == participant) ringTail = prevNode;

        if (totalParticipants > 0) {
            unchecked {
                totalParticipants--;
            }
        }
    }

    function _sendValue(address to, uint256 amount) internal {
        (bool sent,) = payable(to).call{value: amount}("");
        if (!sent) revert TransferFailed();
    }

    // ------------------------------------------------------------
    // -------------------- View / Pure Functions -----------------
    // ------------------------------------------------------------

    /**
     * @notice Returns the current epoch number (0-indexed from game start).
     */
    function currentEpoch() public view returns (uint256) {
        if (phase != Phase.Active) return 0;
        return (block.timestamp - gameStartTime) / epochDuration;
    }

    /**
     * @notice Check if a participant is delinquent (can be liquidated now).
     */
    function isDelinquent(address who) external view returns (bool) {
        if (phase != Phase.Active) return false;

        uint256 epoch = currentEpoch();
        if (epoch == 0) return false;

        Participant storage p = participants[who];
        if (!p.alive || uint256(p.lastBeat) >= epoch) return false;

        uint256 epochStart = gameStartTime + (epoch * epochDuration);
        return block.timestamp >= epochStart + LIQUIDATION_GRACE_PERIOD;
    }

    /**
     * @notice Get the full ring as an ordered array of addresses (for off-chain consumption).
     * @return addrs Array of alive participant addresses in ring order
     */
    function getRing() external view returns (address[] memory addrs) {
        if (ringSize == 0) return new address[](0);

        addrs = new address[](ringSize);
        address cursor = ringHead;
        uint256 guard = totalParticipants;

        for (uint256 i = 0; i < ringSize;) {
            if (guard == 0) revert RingInvariantBroken();

            if (participants[cursor].alive) {
                addrs[i] = cursor;
                unchecked {
                    i++;
                }
            }

            cursor = participants[cursor].next;
            unchecked {
                guard--;
            }
        }
    }

    /**
     * @notice Returns time remaining in the current epoch (seconds).
     */
    function timeUntilEpochEnd() external view returns (uint256) {
        if (phase != Phase.Active) return 0;
        uint256 elapsed = (block.timestamp - gameStartTime) % epochDuration;
        return epochDuration - elapsed;
    }

    function _computeLiquidationAmounts(uint256 totalStake)
        internal
        view
        returns (uint256 bounty, uint256 leftShare, uint256 rightShare)
    {
        bounty = (totalStake * liquidationBountyBps) / 10000;
        uint256 distributable = totalStake - bounty;
        leftShare = distributable / 2;
        rightShare = distributable - leftShare;
    }
}
