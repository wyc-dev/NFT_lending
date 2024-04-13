// SPDX-License-Identifier: MIT
pragma solidity ^0.8.8;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";



/**
 * @title NFT Lending and Borrowing Contract
 * @dev Implements lending and borrowing functions for NFTs using ETH as collateral.
 */
contract NFTLending is Ownable, ReentrancyGuard {

    struct Loan {
        address borrower;
        uint256 nftId;
        address nftAddress;
        uint256 loanAmount;
        uint256 interestRate;
        uint256 loanStart;
    }

    // Constant daily interest rate of 0.1%
    uint256 public INTEREST_RATE = 100;

    // Mapping from loan ID to loan details
    mapping(uint256 => Loan) public loans;

    // Next available loan ID
    uint256 public nextLoanId;

    // Mapping from lender's address to the amount of ETH collateral deposited
    mapping(address => uint256) public collateral;

    // Mapping from borrower's address to their list of loan IDs.
    mapping(address => uint256[]) private _borrowerLoans;

    // Events
    event CollateralDeposited(address indexed depositor, uint256 amount);
    event CollateralWithdrawn(address indexed owner, uint256 amount);
    event LoanCreated(uint256 indexed loanId, address indexed borrower, uint256 amount, uint256 interestRate);
    event LoanRepaid(uint256 indexed loanId, address indexed borrower, uint256 amountPaid);
    event LoanLiquidated(uint256 indexed loanId, address indexed owner);
    event InterestRateChanged(uint256 newRate);
    event NFTApprovedByUser(address indexed user, address indexed nftAddress, uint256 indexed nftId);



    /**
     * @dev Sets the original owner of the contract to the deployer.
     */
    constructor() Ownable(_msgSender()) {
        nextLoanId = 1;
    }



    /**
     * @dev Allows users to deposit ETH as collateral for borrowing NFTs.
     * Emits a CollateralDeposited event upon success.
     */
    function depositCollateral() external payable {
        require(msg.value > 0, "Deposit must be greater than 0");
        collateral[_msgSender()] += msg.value;
        emit CollateralDeposited(_msgSender(), msg.value);
    }



    /**
     * @dev Allows the owner to withdraw deposited ETH collateral.
     * This function includes non-reentrant protection.
     * Emits a CollateralWithdrawn event upon success.
     */
    function withdrawCollateral(uint256 amount) external onlyOwner nonReentrant {
        require(amount <= address(this).balance, "Insufficient balance in contract");
        require(amount <= collateral[_msgSender()], "Insufficient collateral deposited");
        collateral[_msgSender()] -= amount;
        payable(_msgSender()).transfer(amount);
        emit CollateralWithdrawn(_msgSender(), amount);
    }



    /**
     * @dev Transfers ownership of the contract to a new address.
     * Can only be called by the current owner.
     */
    function changeOwnership(address newOwner) external onlyOwner {
        transferOwnership(newOwner);
    }



    /**
     * @dev Allows the owner to change the interest rate for new loans.
     * @param newRate The new interest rate to set.
     */
    function setInterestRate(uint256 newRate) external onlyOwner {
        INTEREST_RATE = newRate;
        emit InterestRateChanged(newRate);
    }



    /**
    * @dev Approves a specific NFT to be managed by the contract.
    * This is necessary for the contract to facilitate borrowing and lending of the NFT.
    * Emits an NFTApprovedByUser event after successful approval.
    * @param nftAddress The address of the NFT contract.
    * @param nftId The identifier of the NFT to be managed.
    */
    function approveNFTTransaction(address nftAddress, uint256 nftId) external {
        IERC721(nftAddress).approve(address(this), nftId);
        emit NFTApprovedByUser(msg.sender, nftAddress, nftId);
    }



    /**
    * @dev Creates a loan agreement for an NFT using market price to determine loan amount.
    * Only the owner can execute this, and it uses non-reentrant protection.
    * Adds the new loan ID to the borrower's list of loans.
    * Emits a LoanCreated event upon success.
    * @param borrower The address of the borrower receiving the NFT.
    * @param nftAddress The address of the NFT contract.
    * @param nftId The identifier of the NFT.
    * @param loanAmount The amount of ETH to be loaned.
    */
    function createLoan(address borrower, address nftAddress, uint256 nftId, uint256 loanAmount) external onlyOwner nonReentrant {
        require(borrower != address(0), "Invalid borrower address");
        require(borrower != _msgSender(), "Owner cannot be borrower");
        require(loanAmount <= address(this).balance, "Contract has insufficient funds");
        require(IERC721(nftAddress).ownerOf(nftId) == borrower, "Borrower must own the NFT");
        require(IERC721(nftAddress).isApprovedForAll(borrower, address(this)), "Contract must be approved to transfer NFT");

        loans[nextLoanId] = Loan(borrower, nftId, nftAddress, loanAmount, INTEREST_RATE, block.timestamp);
        _borrowerLoans[borrower].push(nextLoanId);

        IERC721(nftAddress).transferFrom(borrower, address(this), nftId);
        payable(borrower).transfer(loanAmount);
        emit LoanCreated(nextLoanId, borrower, loanAmount, INTEREST_RATE);

        nextLoanId++;
    }



    /**
    * @dev Allows a borrower to repay their loan and retrieve their NFT.
    * Calculates interest based on the time elapsed since the loan was created using inline assembly.
    * Emits a LoanRepaid event upon success.
    * @param loanId The identifier of the loan being repaid.
    */
    function repayLoan(uint256 loanId) external payable nonReentrant {
        Loan storage loan = loans[loanId];
        require(loan.borrower != address(0), "Invalid loan ID");
        require(_borrowerLoans[loan.borrower].length > 0, "No loans exist for this borrower");

        uint256 daysElapsed;
        uint256 interest;
        uint256 totalDue;
        uint256 excess;

        assembly {
            daysElapsed := div(sub(timestamp(), sload(add(loan.slot, 5))), 86400)
            let loanAmount := sload(add(loan.slot, 3))
            let interestRate := sload(add(loan.slot, 4))
            interest := div(mul(mul(loanAmount, interestRate), daysElapsed), 100000)
            totalDue := add(loanAmount, interest)
            excess := sub(calldataload(4), totalDue)
        }

        require(msg.value >= totalDue, "Insufficient amount to repay the loan");

        if (excess > 0) {
            payable(_msgSender()).transfer(excess);
        }

        IERC721(loan.nftAddress).transferFrom(address(this), loan.borrower, loan.nftId);
        emit LoanRepaid(loanId, loan.borrower, msg.value - excess);

        // Remove loan ID from borrower's list
        removeLoanId(loan.borrower, loanId);

        delete loans[loanId];
    }



    // Helper function to remove a loan ID from a borrower's list
    function removeLoanId(address borrower, uint256 loanId) internal {
        uint256[] storage loanIds = _borrowerLoans[borrower];
        for (uint256 i = 0; i < loanIds.length; i++) {
            if (loanIds[i] == loanId) {
                loanIds[i] = loanIds[loanIds.length - 1];
                loanIds.pop();
                break;
            }
        }
    }



    /**
    * @dev Liquidates a loan if the market price of the NFT falls below the loan value,
    * or if the total amount due (including interest) exceeds the market value of the NFT.
    * Only the owner can execute this, and it includes non-reentrant protection.
    * Emits a LoanLiquidated event upon success.
    * @param loanId The identifier of the loan to be liquidated.
    * @param currentMarketPrice The current market price of the NFT.
    */
    function liquidateLoan(uint256 loanId, uint256 currentMarketPrice) external onlyOwner nonReentrant {
        uint256 loanStart;
        uint256 loanAmount;
        uint256 interestRate;
        uint256 nftId;
        address nftAddress;

        assembly {
            let loanPtr := add(loans.slot, mul(loanId, 0x20))
            loanStart := sload(add(loanPtr, 5))
            loanAmount := sload(add(loanPtr, 3))
            interestRate := sload(add(loanPtr, 4))
            nftAddress := sload(add(loanPtr, 2))
            nftId := sload(add(loanPtr, 1))
        }

        uint256 daysElapsed = (block.timestamp - loanStart) / 86400;
        uint256 interest = loanAmount * interestRate * daysElapsed / 100000;
        uint256 totalDue = loanAmount + interest;

        require(currentMarketPrice < loanAmount || totalDue > currentMarketPrice, "Loan cannot be liquidated");

        IERC721(nftAddress).transferFrom(address(this), owner(), nftId);
        emit LoanLiquidated(loanId, owner());

        // Remove loan ID from borrower's list
        removeLoanId(loans[loanId].borrower, loanId);

        delete loans[loanId];
    }



    /**
     * @dev Public function to allow users to check if the current market price is below the total due of a loan.
     * @param loanId The ID of the loan to check.
     * @param currentMarketPrice The current market price in ETH to compare with the loan's total due.
     * @return bool Returns true if the current market price is lower than the total due, false otherwise.
     */
    function isMarketPriceBelowTotalDue(uint256 loanId, uint256 currentMarketPrice) external view returns (bool) {
        require(loanId < nextLoanId, "Loan does not exist");
        Loan storage loan = loans[loanId];
        uint256 daysElapsed = (block.timestamp - loan.loanStart) / 86400;
        uint256 interest = (loan.loanAmount * loan.interestRate * daysElapsed) / 100000;
        uint256 totalDue = loan.loanAmount + interest;
        return currentMarketPrice < totalDue;
    }



    /**
    * @dev Returns an array of loan IDs associated with the caller, facilitating tracking and management of their loans.
    * This function enhances transparency and borrower accessibility to their loan records.
    * @return uint256[] An array of loan IDs linked to the caller's address.
    */
    function getMyLoans() external view returns (uint256[] memory) {
        return _borrowerLoans[_msgSender()];
    }



    /**
    * @dev Calculates the total amount due for a specific loan to allow the borrower to retrieve their NFT.
    * This includes the principal and the interest accrued over time.
    * Uses inline assembly for gas-efficient calculations.
    * @param loanId The identifier of the loan.
    * @return totalDue The total amount of ETH required to repay the loan.
    */
    function checkRepaymentAmount(uint256 loanId) external view returns (uint256 totalDue) {
        require(loanId < nextLoanId, "Loan does not exist");
        Loan storage loan = loans[loanId];

        uint256 daysElapsed;
        uint256 interest;

        assembly {
            // Load loan data from storage
            let loanStart := sload(add(loan.slot, 5))  // loan.loanStart
            let loanAmount := sload(add(loan.slot, 3)) // loan.loanAmount
            let interestRate := sload(add(loan.slot, 4)) // loan.interestRate

            // Calculate days elapsed = (block.timestamp - loanStart) / 86400
            daysElapsed := div(sub(timestamp(), loanStart), 86400)

            // Calculate interest = (loanAmount * interestRate * daysElapsed) / 100000
            interest := div(mul(mul(loanAmount, interestRate), daysElapsed), 100000)

            // Calculate totalDue = loanAmount + interest
            totalDue := add(loanAmount, interest)
        }
        
        return totalDue;
    }

}
