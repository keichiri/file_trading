pragma solidity ^0.4.24;


/// @title File Trading application - demonstrates how to use IPFS as a storage for DAPPs
/// @author Janko Krstic <keichiri@protonmail.com>
/// @notice Proof of concept smart contract created for demonstrative purposes
///         The business model is intentionally naive
/// @dev Some of the data stored in the contract could be stored in events to save storage costs
contract FileTrading {
    address public owner;
    uint public fee;
    uint fileOfferingsCounter;
    mapping (uint => FileOffering) public fileOfferings;
    uint[] activeFileOfferings;

    struct FileOffering {
        address offeror;
        bytes fileName;
        bytes32 fileHash;
        uint price;
        uint requiredDeposit;
        uint requestCounter;
        uint[] activeRequests;
        mapping (uint => FileRequest) requests;
    }

    struct FileRequest {
        uint id;
        address buyer;
        bytes publicKey;
        uint paid;
    }


    event NewFileOffering(uint indexed id, address indexed offeror, bytes fileName, bytes32 fileHash, uint price, uint requiredDeposit);
    event FileOfferingRemoved(uint indexed id, address indexed offeror, bytes fileName, bytes32 fileHash);
    event NewFileRequest(uint indexed id, uint indexed fileOfferingID, address indexed buyer, bytes publicKey);

    modifier isActiveFileOffering(uint _fileOfferingID) {
        require(_fileOfferingID <= fileOfferingsCounter, "File offering ID must be one issued before");

        bool active = false;
        for (uint i = 0; i < activeFileOfferings.length; i++) {
            if (activeFileOfferings[i] == _fileOfferingID) {
                active = true;
                break;
            }
        }

        require(active, "File offering ID must belong to active file offering");

        _;
    }

    modifier onlyOwnerOrOfferor(uint _fileOfferingID) {
        require(msg.sender == owner || fileOfferings[_fileOfferingID].offeror == msg.sender, "Sender must be either offeror or owner");

        _;
    }

    /// @notice Creates FileTrading contract, setting the owner and initial offering fee
    /// @param _fee The fee for creating file offerings
    constructor(uint _fee) public {
        fee = _fee;
        owner = msg.sender;
    }

    /// @notice Creates file offering
    /// @dev It is advisable to not use very long file names. Also, if fee is overpaid, the money is not returned
    /// @param _fileName Name of the file that is being offered
    /// @param _price Price for the file
    /// @param _fileHash The hash of the file before encryption
    /// @param _requiredDeposit Deposit that is required before sending file
    function createFileOffering(bytes _fileName, bytes32 _fileHash, uint _price, uint _requiredDeposit) public payable {
        require(msg.value >= fee, "Must send enough wei to cover file offering fee");

        fileOfferingsCounter++;

        // Creating offering
        fileOfferings[fileOfferingsCounter].offeror = msg.sender;
        fileOfferings[fileOfferingsCounter].fileName = _fileName;
        fileOfferings[fileOfferingsCounter].fileHash = _fileHash;
        fileOfferings[fileOfferingsCounter].price = _price;
        fileOfferings[fileOfferingsCounter].requiredDeposit = _requiredDeposit;

        activeFileOfferings.push(fileOfferingsCounter);

        emit NewFileOffering(fileOfferingsCounter, msg.sender, _fileName, _fileHash, _price, _requiredDeposit);
    }

    /// @notice Removes file offering. Makes sure all the ether is refunded
    /// @param _fileOfferingID File offering being removed
    function removeFileOffering(uint _fileOfferingID)
        public isActiveFileOffering(_fileOfferingID) onlyOwnerOrOfferor(_fileOfferingID) {

        // For security reasons, removing from active first - prevents reentrancy attacks
        uint index;
        for (uint i = 0; i < activeFileOfferings.length; i++) {
            if (activeFileOfferings[i] == _fileOfferingID) {
                index = i;
                break;
            }
        }

        while (index < activeFileOfferings.length - 1) {
            activeFileOfferings[index] = activeFileOfferings[index+1];
            index++;
        }
        delete activeFileOfferings[activeFileOfferings.length - 1];
        activeFileOfferings.length--;

        FileOffering storage offering = fileOfferings[_fileOfferingID];

        // Sending ether back for active file
        address buyer;
        uint value;
        uint requestID;
        for (i = 0; i < offering.activeRequests.length; i++) {
            requestID = offering.activeRequests[i];
            buyer = offering.requests[requestID].buyer;
            value = offering.requests[requestID].paid;
            buyer.transfer(value);
        }

        emit FileOfferingRemoved(
            _fileOfferingID,
            offering.offeror,
            offering.fileName,
            offering.fileHash
        );

        // Deleting
        delete fileOfferings[_fileOfferingID];
    }


    /// @notice Called by client with the intention of purchasing the file's content
    /// @param _fileOfferingID The file offering that is desired
    /// @param _publicKey bytes32 The public key that will be used to encrypt the file
    function requestFile(uint _fileOfferingID, bytes _publicKey) public payable isActiveFileOffering(_fileOfferingID) {
        FileOffering storage offering = fileOfferings[_fileOfferingID];

        require(msg.value >= offering.requiredDeposit, "Must send deposit");

        offering.requestCounter++;
        offering.requests[offering.requestCounter].id = offering.requestCounter;
        offering.requests[offering.requestCounter].buyer = msg.sender;
        offering.requests[offering.requestCounter].publicKey = _publicKey;
        offering.requests[offering.requestCounter].paid = msg.value;
        offering.activeRequests.push(offering.requestCounter);

        emit NewFileRequest(offering.requestCounter, _fileOfferingID, msg.sender, _publicKey);
    }


    /** View functions */
    function getActiveFileOfferings() public view returns (uint[]) {
        return activeFileOfferings;
    }

    function getRequestIDsForFileOffering(uint _fileOfferingID) public view returns (uint[]) {
        return fileOfferings[_fileOfferingID].activeRequests;
    }

    function getFileRequest(uint _fileOfferingID, uint _fileRequestID) public view returns (uint, address, bytes, uint) {
        return (
            fileOfferings[_fileOfferingID].requests[_fileRequestID].id,
            fileOfferings[_fileOfferingID].requests[_fileRequestID].buyer,
            fileOfferings[_fileOfferingID].requests[_fileRequestID].publicKey,
            fileOfferings[_fileOfferingID].requests[_fileRequestID].paid
        );
    }
}
