pragma solidity ^0.4.24;


/// @title File Trading demonstration
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
    }


    event NewFileOffering(uint indexed id, address indexed offeror, bytes fileName, uint price);


    /// @notice Creates FileTrading contract, setting the owner and initial offering fee
    /// @param _fee The fee for creating file offerings
    constructor(uint _fee) public {
        fee = _fee;
        owner = msg.sender;
    }

    /// @notice Creates FileOffering
    /// @dev It is advisable to not use very long file names. Also, if fee is overpaid, the money is not returned
    /// @param _fileName Name of the file that is being offered
    /// @param _price Price for the file
    function createFileOffering(bytes _fileName, uint _price) public payable {
        require(msg.value >= fee, "Must send enough wei to cover file offering fee");

        fileOfferingsCounter++;

        // Creating offering
        fileOfferings[fileOfferingsCounter].offeror = msg.sender;
        fileOfferings[fileOfferingsCounter].fileName = _fileName;
        fileOfferings[fileOfferingsCounter].price = _price;

        activeFileOfferings.push(fileOfferingsCounter);

        emit NewFileOffering(fileOfferingsCounter, msg.sender, _fileName, _price);
    }


    /// @notice
}
