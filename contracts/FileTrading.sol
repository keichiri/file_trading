pragma solidity ^0.4.24;


/// @title File Trading application - demonstrates how to use IPFS as a storage for DAPPs
/// @author Janko Krstic <keichiri@protonmail.com>
/// @notice Proof of concept smart contract created for demonstrative purposes
///         The business model is intentionally naive
contract FileTrading {
    address public owner;
    uint public fee;
    uint fileOfferingsCounter;
    mapping (uint => FileOffering) public fileOfferings;
    uint[] activeFileOfferings;

    struct FileOffering {
        address offeror;
        bytes fileName;
        uint price;
        uint requiredDeposit;
    }


    event NewFileOffering(uint indexed id, address indexed offeror, bytes fileName, uint price, uint requiredDeposit);
    event FileOfferingRemoved(uint indexed id, address indexed offeror, bytes fileName);

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
    /// @param _requiredDeposit Deposit that is required before sending file
    function createFileOffering(bytes _fileName, uint _price, uint _requiredDeposit) public payable {
        require(msg.value >= fee, "Must send enough wei to cover file offering fee");

        fileOfferingsCounter++;

        // Creating offering
        fileOfferings[fileOfferingsCounter].offeror = msg.sender;
        fileOfferings[fileOfferingsCounter].fileName = _fileName;
        fileOfferings[fileOfferingsCounter].price = _price;
        fileOfferings[fileOfferingsCounter].requiredDeposit = _requiredDeposit;

        activeFileOfferings.push(fileOfferingsCounter);

        emit NewFileOffering(fileOfferingsCounter, msg.sender, _fileName, _price, _requiredDeposit);
    }

    /// @notice Removes file offering. Makes sure all the ether is refunded
    /// @param _fileOfferingID File offering being removed
    function removeFileOffering(uint _fileOfferingID)
        public isActiveFileOffering(_fileOfferingID) onlyOwnerOrOfferor(_fileOfferingID) {

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

        emit FileOfferingRemoved(
            _fileOfferingID,
            fileOfferings[_fileOfferingID].offeror,
            fileOfferings[_fileOfferingID].fileName
        );

        // Deleting
        delete fileOfferings[_fileOfferingID];
        delete activeFileOfferings[activeFileOfferings.length - 1];
        activeFileOfferings.length--;
    }


    function getActiveFileOfferings() public view returns (uint[]) {
        return activeFileOfferings;
    }
}
