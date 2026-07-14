// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title BacktestRegistry — onchain attestation of backtest runs
/// @notice Stores config/result fingerprints so traders can prove what they tested before trading.
contract BacktestRegistry {
    struct Record {
        address committer;
        bytes32 configHash;
        bytes32 resultHash;
        uint40 committedAt;
    }

    uint256 public totalCommits;
    mapping(uint256 => Record) public records;
    mapping(address => uint256[]) private _commitsByUser;

    event ResultCommitted(
        uint256 indexed commitId,
        address indexed committer,
        bytes32 configHash,
        bytes32 resultHash,
        string strategy,
        string market,
        int256 totalPnlUsdCents,
        uint40 committedAt
    );

    function commitResult(
        bytes32 configHash,
        bytes32 resultHash,
        string calldata strategy,
        string calldata market,
        int256 totalPnlUsdCents
    ) external returns (uint256 commitId) {
        commitId = ++totalCommits;
        records[commitId] = Record({
            committer: msg.sender,
            configHash: configHash,
            resultHash: resultHash,
            committedAt: uint40(block.timestamp)
        });
        _commitsByUser[msg.sender].push(commitId);

        emit ResultCommitted(
            commitId,
            msg.sender,
            configHash,
            resultHash,
            strategy,
            market,
            totalPnlUsdCents,
            uint40(block.timestamp)
        );
    }

    function commitsByUser(address user) external view returns (uint256[] memory) {
        return _commitsByUser[user];
    }
}
