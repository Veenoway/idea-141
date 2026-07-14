// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {BacktestRegistry} from "../contracts/BacktestRegistry.sol";

contract Deploy is Script {
    function run() external returns (address deployed) {
        uint256 pk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        vm.startBroadcast(pk);
        deployed = address(new BacktestRegistry());
        vm.stopBroadcast();
    }
}
