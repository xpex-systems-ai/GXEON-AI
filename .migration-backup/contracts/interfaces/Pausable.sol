// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

abstract contract Pausable {
    bool private _paused;
    address private _pausableOwner;
    
    event Paused(address account);
    event Unpaused(address account);
    
    constructor() {
        _paused = false;
        _pausableOwner = msg.sender;
    }
    
    function _setPausableOwner(address newOwner) internal {
        _pausableOwner = newOwner;
    }
    
    modifier whenNotPaused() {
        require(!_paused, "Pausable: paused");
        _;
    }
    
    modifier whenPaused() {
        require(_paused, "Pausable: not paused");
        _;
    }
    
    modifier onlyPausableOwner() {
        require(msg.sender == _pausableOwner, "Pausable: not owner");
        _;
    }
    
    function paused() public view returns (bool) {
        return _paused;
    }
    
    function _pause() internal whenNotPaused {
        _paused = true;
        emit Paused(msg.sender);
    }
    
    function _unpause() internal whenPaused {
        _paused = false;
        emit Unpaused(msg.sender);
    }
    
    function pause() public virtual onlyPausableOwner {
        _pause();
    }
    
    function unpause() public virtual onlyPausableOwner {
        _unpause();
    }
}
