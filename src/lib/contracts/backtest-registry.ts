export const backtestRegistryAbi = [
  {
    type: "function",
    name: "commitResult",
    stateMutability: "nonpayable",
    inputs: [
      { name: "configHash", type: "bytes32" },
      { name: "resultHash", type: "bytes32" },
      { name: "strategy", type: "string" },
      { name: "market", type: "string" },
      { name: "totalPnlUsdCents", type: "int256" },
    ],
    outputs: [{ name: "commitId", type: "uint256" }],
  },
  {
    type: "function",
    name: "totalCommits",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "event",
    name: "ResultCommitted",
    inputs: [
      { name: "commitId", type: "uint256", indexed: true },
      { name: "committer", type: "address", indexed: true },
      { name: "configHash", type: "bytes32", indexed: false },
      { name: "resultHash", type: "bytes32", indexed: false },
      { name: "strategy", type: "string", indexed: false },
      { name: "market", type: "string", indexed: false },
      { name: "totalPnlUsdCents", type: "int256", indexed: false },
      { name: "committedAt", type: "uint40", indexed: false },
    ],
  },
] as const;
