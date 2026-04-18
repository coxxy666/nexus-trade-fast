// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * Standard ERC20-compatible token deployed through SaveMeme.
 * The token itself stays a normal BEP20; attribution is carried by the factory event and metadata URI.
 */
contract FactoryBEP20Token {
    string public name;
    string public symbol;
    uint8 public immutable decimals;
    uint256 public totalSupply;
    string public metadataURI;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    constructor(
        string memory _name,
        string memory _symbol,
        uint8 _decimals,
        uint256 _initialSupply,
        address _owner,
        string memory _metadataURI
    ) {
        require(_owner != address(0), "invalid owner");
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
        metadataURI = _metadataURI;
        _mint(_owner, _initialSupply);
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 currentAllowance = allowance[from][msg.sender];
        require(currentAllowance >= amount, "allowance exceeded");
        unchecked {
            allowance[from][msg.sender] = currentAllowance - amount;
        }
        _transfer(from, to, amount);
        return true;
    }

    function _mint(address to, uint256 amount) internal {
        totalSupply += amount;
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
    }

    function _transfer(address from, address to, uint256 amount) internal {
        require(to != address(0), "invalid recipient");
        uint256 fromBal = balanceOf[from];
        require(fromBal >= amount, "insufficient balance");
        unchecked {
            balanceOf[from] = fromBal - amount;
        }
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
    }
}

contract Bep20Factory {
    string public constant PLATFORM = "SaveMeme";
    address public owner;

    struct MintedTokenInfo {
        address token;
        address creator;
        address tokenOwner;
        string name;
        string symbol;
        string metadataURI;
        uint256 createdAt;
    }

    MintedTokenInfo[] public mintedTokens;

    event TokenCreated(address indexed token, address indexed creator, string platform);
    event TokenCreatedDetailed(
        address indexed token,
        address indexed creator,
        address indexed tokenOwner,
        string name,
        string symbol,
        uint8 decimals,
        uint256 initialSupply,
        string metadataURI,
        string platform
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "invalid owner");
        owner = newOwner;
    }

    function totalMintedBySaveMeme() external view returns (uint256) {
        return mintedTokens.length;
    }

    function getMintedToken(uint256 index) external view returns (MintedTokenInfo memory) {
        require(index < mintedTokens.length, "index out of range");
        return mintedTokens[index];
    }

    function createToken(
        string memory _name,
        string memory _symbol,
        uint8 _decimals,
        uint256 _initialSupply,
        address _tokenOwner
    ) external returns (address tokenAddress) {
        return _createToken(_name, _symbol, _decimals, _initialSupply, _tokenOwner, "");
    }

    function createToken(
        string memory _name,
        string memory _symbol,
        uint8 _decimals,
        uint256 _initialSupply,
        address _tokenOwner,
        string memory _metadataURI
    ) external returns (address tokenAddress) {
        return _createToken(_name, _symbol, _decimals, _initialSupply, _tokenOwner, _metadataURI);
    }

    function _createToken(
        string memory _name,
        string memory _symbol,
        uint8 _decimals,
        uint256 _initialSupply,
        address _tokenOwner,
        string memory _metadataURI
    ) internal returns (address tokenAddress) {
        require(bytes(_name).length > 0, "name required");
        require(bytes(_symbol).length > 0, "symbol required");
        require(_tokenOwner != address(0), "invalid owner");
        require(_initialSupply > 0, "supply required");

        FactoryBEP20Token token = new FactoryBEP20Token(
            _name,
            _symbol,
            _decimals,
            _initialSupply,
            _tokenOwner,
            _metadataURI
        );
        tokenAddress = address(token);

        mintedTokens.push(MintedTokenInfo({
            token: tokenAddress,
            creator: msg.sender,
            tokenOwner: _tokenOwner,
            name: _name,
            symbol: _symbol,
            metadataURI: _metadataURI,
            createdAt: block.timestamp
        }));

        emit TokenCreated(tokenAddress, msg.sender, PLATFORM);
        emit TokenCreatedDetailed(tokenAddress, msg.sender, _tokenOwner, _name, _symbol, _decimals, _initialSupply, _metadataURI, PLATFORM);
    }
}
