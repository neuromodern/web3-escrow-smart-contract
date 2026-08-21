import { createAppKit } from '@reown/appkit'
import { mainnet, sepolia, bsc, polygon, base, arbitrum, optimism, type AppKitNetwork } from '@reown/appkit/networks'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { watchAccount, readContract, writeContract, waitForTransactionReceipt } from '@wagmi/core'
import { parseUnits, formatUnits, parseAbi, decodeEventLog, getAddress } from 'viem'
import { APP_CONFIG, type Token } from './config'

// Configuration AppKit, use appkit site to get a key
const projectId = '';
if (projectId === '') 
  {
    alert ('You should register on reown.com for allow reown AppKit read blockchain data');
  }

// Fixed TS2322: Explicitly cast as AppKitNetwork tuple
const networks = [mainnet, sepolia, bsc, polygon, base, arbitrum, optimism] as [AppKitNetwork, ...AppKitNetwork[]];

const wagmiAdapter = new WagmiAdapter({
  networks,
  projectId
});

createAppKit({
  adapters: [wagmiAdapter],
  networks,
  projectId,
  metadata: {
    name: 'EasyEscrow',
    description: 'Web3 Escrow Service',
    url: window.location.origin,
    icons: []
  }
});

// Full contract ABI
const escrowAbi = parseAbi([
  'function trades(uint256) view returns (address buyer, address seller, address arbiter, address token, uint256 amount, uint256 arbiterFee, uint256 sellerTimeout, uint256 arbiterTimeout, uint8 status)',
  'function createTrade(address _seller, address _arbiter, address _token, uint256 _amount, uint256 _arbiterFee, uint256 _sellerTimeoutSeconds, uint256 _arbiterTimeoutSeconds, bool _autoApproveSeller) payable',
  'function sellerDeliver(uint256)',
  'function resolveTrade(uint256 _tradeId, bool _inFavorOfBuyer)',
  'function sellerTimeoutRefund(uint256 _tradeId)',
  'function emergencyRefundBuyer(uint256 _tradeId)',
  'function tradeCounter() view returns (uint256)',
  'event TradeCreated(uint256 indexed tradeId, address indexed buyer, address indexed seller, address token)'
]);

const erc20Abi = parseAbi([
  'function approve(address spender, uint256 amount) returns (bool)'
]);

// --- 2. State Management ---
let currentUserAddress: `0x${string}` | undefined = undefined;
let currentChainId: number | undefined = undefined;
let currentTradeId: number | null = null;

// DOM Elements
const elWrongNetwork = document.getElementById('state-wrong-network')!;
const elLoading = document.getElementById('state-loading')!;
const elHome = document.getElementById('state-home')!;
const elEscrowView = document.getElementById('state-escrow-view')!;
const tokenSelect = document.getElementById('input-token') as HTMLSelectElement;

const createTradeForm = document.getElementById('create-trade-form') as HTMLFormElement;
const createResultBox = document.getElementById('create-result-box')!;

// Modal Elements
const modalOpenEscrow = document.getElementById('modal-open-escrow')!;
const inputEscrowId = document.getElementById('input-escrow-id') as HTMLInputElement;

// App Initialization & Listeners ---

watchAccount(wagmiAdapter.wagmiConfig, {
  onChange(data) {
    currentUserAddress = data.address;
    currentChainId = data.chainId;
    evaluateGlobalState();
  }
});

window.addEventListener('hashchange', evaluateGlobalState);
evaluateGlobalState();


// Layer 1 & 2: Routing and Network Validation
function evaluateGlobalState() {
  hideAllViews();

  // Get button elements
  const btnOpenPopup = document.getElementById('btn-open-popup') as HTMLButtonElement;
  const btnCreateTrade = document.getElementById('btn-create-trade') as HTMLButtonElement;

  // 1. Check connection status
  const isConnected = !!currentUserAddress;

  // Enable or disable buttons based on connection status
  btnOpenPopup.disabled = !isConnected;
  btnCreateTrade.disabled = !isConnected;

  // Update main button text for better UX
  btnCreateTrade.textContent = isConnected ? "Deploy Escrow Transaction" : "Connect Wallet to Deploy";

  // 2. Network Selection: If wallet is not connected, fallback to Ethereum (1) by default
  // so the form can still render the initial token list.
  const activeChainId = (currentChainId && APP_CONFIG[currentChainId]) ? currentChainId : 1;

  // 3. If connected but on an unsupported network, show error state
  if (isConnected && currentChainId && !APP_CONFIG[currentChainId]) {
    elWrongNetwork.classList.remove('hidden');
    return;
  }

  // 4. Update UI network information
  document.getElementById('ui-current-network')!.textContent = isConnected
    ? APP_CONFIG[activeChainId].name
    : "Not Connected (Default: Ethereum)";

  // Populate tokens for the selected (or default) network
  populateTokenDropdown(activeChainId);

  // 5. Hash-based Routing (open specific trade)
  const hash = window.location.hash;
  if (hash.startsWith('#escrow')) {
    const tradeId = parseInt(hash.replace('#escrow', ''));
    if (!isNaN(tradeId) && tradeId > 0 && tradeId <= Number.MAX_SAFE_INTEGER) {
      currentTradeId = tradeId;

      if (isConnected) {
        loadEscrowTrade(tradeId);
        return; // Stop execution here, the escrow view is loading
      }
      // If not connected, we DO NOT clear the hash and DO NOT return.
      // We let the script fall through to show the Home screen. 
      // Once Wagmi connects, this function will run again and load the trade.
    }
  } else {
    // Only reset the trade ID if there is no hash
    currentTradeId = null;
  }

  // Reset home view state (ensure form is visible, result box hidden)
  createTradeForm.classList.remove('hidden');
  createResultBox.classList.add('hidden');
  elHome.classList.remove('hidden');
}

function populateTokenDropdown(chainId: number) {
  tokenSelect.innerHTML = '';
  const tokens = APP_CONFIG[chainId].tokens;

  for (const [key, token] of Object.entries(tokens)) {
    const option = document.createElement('option');
    option.value = key;
    option.textContent = token.symbol;
    tokenSelect.appendChild(option);
  }
}

/**
 * Layer 3: Load Data
 */
async function loadEscrowTrade(tradeId: number) {
  if (!currentChainId) return;
  hideAllViews();
  showLoading("Fetching trade data...");

  const contractAddress = APP_CONFIG[currentChainId].escrowContractAddress;

  try {
    const tradeData = await readContract(wagmiAdapter.wagmiConfig, {
      address: contractAddress as `0x${string}`,
      abi: escrowAbi,
      functionName: 'trades',
      args: [BigInt(tradeId)]
    });

    // Fixed TS6133: Prefixed unused variables with _
    const [buyer, seller, arbiter, tokenAddr, amount, _arbiterFee, _sellerTimeout, _arbiterTimeout, status] = tradeData;

    hideAllViews();
    elEscrowView.classList.remove('hidden');

    document.getElementById('ui-trade-id')!.textContent = tradeId.toString();
    document.getElementById('ui-buyer')!.textContent = buyer;
    document.getElementById('ui-seller')!.textContent = seller;
    document.getElementById('ui-arbiter')!.textContent = arbiter;
    document.getElementById('ui-status')!.textContent = parseTradeStatus(status);

    // Find Token Metadata to format Amount dynamically
    const tokens = APP_CONFIG[currentChainId].tokens;
    let decimals = 18; // Default for Native
    let symbol = "Token";

    for (const key in tokens) {
      if (tokens[key].address.toLowerCase() === tokenAddr.toLowerCase()) {
        decimals = tokens[key].decimals;
        symbol = tokens[key].symbol;
        break;
      }
    }

    const formattedAmount = formatUnits(amount, decimals);
    document.getElementById('ui-amount')!.textContent = `${formattedAmount} ${symbol}`;

    renderRolePanel(buyer, seller, arbiter, status);
  } catch (error) {
    console.error("Fetch error:", error);
    alert("Failed to load trade. ID may not exist.");
    window.location.hash = '';
  }
}

/**
 * Layer 3.1: Render Buttons
 */
function renderRolePanel(buyer: string, seller: string, arbiter: string, status: number) {
  const actionPanel = document.getElementById('action-panel')!;
  const observerPanel = document.getElementById('observer-panel')!;
  const roleIndicator = document.getElementById('role-indicator')!;

  // Selects only action buttons INSIDE the action panel
  document.querySelectorAll('#action-panel .action-btn').forEach(btn => btn.classList.add('hidden'));

  const isBuyer = currentUserAddress?.toLowerCase() === buyer.toLowerCase();
  const isSeller = currentUserAddress?.toLowerCase() === seller.toLowerCase();
  const isArbiter = currentUserAddress?.toLowerCase() === arbiter.toLowerCase();

  // Statuses: 0=AwaitingSeller, 1=AwaitingArbiter, 2=Completed, 3=Refunded

  if (isSeller) {
    observerPanel.classList.add('hidden');
    actionPanel.classList.remove('hidden');
    roleIndicator.textContent = "Your Role: Seller";
    if (status === 0) document.getElementById('btn-seller-deliver')!.classList.remove('hidden');
  } else if (isArbiter) {
    observerPanel.classList.add('hidden');
    actionPanel.classList.remove('hidden');
    roleIndicator.textContent = "Your Role: Arbiter (Guarantor)";
    if (status === 1) {
      document.getElementById('btn-arbiter-resolve-buyer')!.classList.remove('hidden');
      document.getElementById('btn-arbiter-resolve-seller')!.classList.remove('hidden');
    }
  } else if (isBuyer) {
    observerPanel.classList.add('hidden');
    actionPanel.classList.remove('hidden');
    roleIndicator.textContent = "Your Role: Buyer";
    if (status === 0) document.getElementById('btn-buyer-refund-seller')!.classList.remove('hidden');
    if (status === 1) document.getElementById('btn-buyer-refund-arbiter')!.classList.remove('hidden');
  } else {
    actionPanel.classList.add('hidden');
    observerPanel.classList.remove('hidden');
  }
}

// --- 4. Form Actions (Create Trade) ---

// Cache the inputs for the dynamic deadline logic
const inputRequireSeller = document.getElementById('input-require-seller') as HTMLInputElement;
const inputSellerTimeout = document.getElementById('input-seller-timeout') as HTMLInputElement;
const inputArbiterTimeout = document.getElementById('input-arbiter-timeout') as HTMLInputElement;

// Dynamic Checkbox Logic: Lock/Unlock Seller Deadline
inputRequireSeller?.addEventListener('change', () => {
  if (inputRequireSeller.checked) {
    inputSellerTimeout.disabled = false;
    const proposedSellerDays = 7;
    const currentArbiterDays = parseInt(inputArbiterTimeout.value) || 14;

    inputSellerTimeout.value = proposedSellerDays.toString();

    // Auto-adjust arbiter deadline to be at least 1 day longer if it's too short
    if (currentArbiterDays <= proposedSellerDays) {
      inputArbiterTimeout.value = (proposedSellerDays + 1).toString();
    }
  } else {
    // Lock and reset to 0 if seller confirmation is bypassed
    inputSellerTimeout.disabled = true;
    inputSellerTimeout.value = "0";
  }
});

// Real-time Validation for Deadlines 

// 1. When the user manually changes the seller deadline
inputSellerTimeout?.addEventListener('input', () => {
  if (inputRequireSeller.checked) {
    let sellerDays = parseInt(inputSellerTimeout.value) || 0;

    // Seller cannot have less than 1 day if the checkbox is active
    if (sellerDays < 1) {
      sellerDays = 1;
      inputSellerTimeout.value = "1";
    }

    // Automatically push arbiter days up if they become less than or equal to seller days
    let arbiterDays = parseInt(inputArbiterTimeout.value) || 0;
    if (arbiterDays <= sellerDays) {
      inputArbiterTimeout.value = (sellerDays + 1).toString();
    }
  }
});

// 2. When the user manually changes the arbiter deadline
inputArbiterTimeout?.addEventListener('input', () => {
  let arbiterDays = parseInt(inputArbiterTimeout.value) || 0;
  let sellerDays = parseInt(inputSellerTimeout.value) || 0;

  // Arbiter cannot have less than 1 day in any case
  if (arbiterDays < 1) {
    arbiterDays = 1;
    inputArbiterTimeout.value = "1";
  }

  // Prevent lowering arbiter days below (seller days + 1)
  if (arbiterDays <= sellerDays) {
    inputArbiterTimeout.value = (sellerDays + 1).toString();
  }
});

createTradeForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!currentUserAddress || !currentChainId) return;

  const chainConfig = APP_CONFIG[currentChainId];
  const contractAddress = chainConfig.escrowContractAddress as `0x${string}`;

  const selectedTokenKey = tokenSelect.value;
  const token: Token = chainConfig.tokens[selectedTokenKey];

  const rawSeller = (document.getElementById('input-seller') as HTMLInputElement).value;
  const rawArbiter = (document.getElementById('input-arbiter') as HTMLInputElement).value;

  let seller: `0x${string}`;
  let arbiter: `0x${string}`;

  // Validate and format addresses
  try {
    seller = validateAndChecksumAddress(rawSeller);
    arbiter = validateAndChecksumAddress(rawArbiter);
  } catch (err: any) {
    alert(err.message);
    return; // Stop execution if addresses are invalid
  }

  // Addresses check
  const buyerLower = currentUserAddress.toLowerCase();
  const sellerLower = seller.toLowerCase();
  const arbiterLower = arbiter.toLowerCase();

  if (buyerLower === sellerLower) {
    alert("Error: Buyer and Seller cannot be the same address.");
    return;
  }

  if (arbiterLower === buyerLower || arbiterLower === sellerLower) {
    alert("Error: Arbiter must be a neutral third party (different from Buyer and Seller).");
    return;
  }

  // Retrieve values
  const amountStr = (document.getElementById('input-amount') as HTMLInputElement).value;
  const feeStr = (document.getElementById('input-arbiter-fee') as HTMLInputElement).value;


  const requireSeller = inputRequireSeller.checked;
  const sellerDays = parseInt(inputSellerTimeout.value) || 0;
  const arbiterDays = parseInt(inputArbiterTimeout.value) || 0;

  // STRICT VALIDATION: Arbiter deadline must be strictly > Seller deadline
  if (arbiterDays < sellerDays + 1) {
    alert(`Error: Arbiter deadline (${arbiterDays} days) must be at least 1 day longer than the Seller deadline (${sellerDays} days).`);
    return;
  }

  // The smart contract expects `_autoApproveSeller` to be TRUE if we skip the seller phase
  const autoApprove = !requireSeller;

  const sellerTimeoutSeconds = BigInt(sellerDays * 24 * 60 * 60);
  const arbiterTimeoutSeconds = BigInt(arbiterDays * 24 * 60 * 60);

  const amountFloat = parseFloat(amountStr);
  const feeFloat = parseFloat(feeStr);

  if (!amountStr || isNaN(amountFloat) || amountFloat <= 0) {
    alert("Error: Please enter a valid positive amount.");
    return;
  }

  if (!feeStr || isNaN(feeFloat) || feeFloat < 0) {
    alert("Error: Please enter a valid arbiter fee (can be 0).");
    return;
  }

  const amountDecimals = amountStr.includes('.') ? amountStr.split('.')[1].length : 0;
  const feeDecimals = feeStr.includes('.') ? feeStr.split('.')[1].length : 0;

  if (amountDecimals > token.decimals) {
    alert(`Error: Too many decimal places for ${token.symbol} (max: ${token.decimals}).`);
    return;
  }

  if (feeDecimals > token.decimals) {
    alert(`Error: Too many decimal places for arbiter fee (max: ${token.decimals}).`);
    return;
  }



  const amountWei = parseUnits(amountStr, token.decimals);
  const arbiterFeeWei = parseUnits(feeStr, token.decimals);
  const platformFeeWei = (amountWei * 50n) / 10000n; // 0.5%

  const totalRequired = amountWei + arbiterFeeWei + platformFeeWei;
  const isNative = token.address === '0x0000000000000000000000000000000000000000';

  try {
    // Approve ERC-20 tokens if needed
    if (!isNative) {
      showLoading(`Approving ${token.symbol}... Please confirm in wallet.`);
      const approveHash = await writeContract(wagmiAdapter.wagmiConfig, {
        address: token.address as `0x${string}`,
        abi: erc20Abi,
        functionName: 'approve',
        args: [contractAddress, totalRequired]
      });
      await waitForTransactionReceipt(wagmiAdapter.wagmiConfig, { hash: approveHash });
    }

    showLoading("Deploying Escrow... Please confirm in wallet.");

    const txHash = await writeContract(wagmiAdapter.wagmiConfig, {
      address: contractAddress,
      abi: escrowAbi,
      functionName: 'createTrade',
      args: [seller, arbiter, token.address, amountWei, arbiterFeeWei, sellerTimeoutSeconds, arbiterTimeoutSeconds, autoApprove],
      value: isNative ? totalRequired : 0n
    });

    showLoading("Waiting for confirmation...");
    // 1. Save the receipt to access transaction logs
    const receipt = await waitForTransactionReceipt(wagmiAdapter.wagmiConfig, { hash: txHash });

    if (receipt.status === 'reverted') {
      throw new Error("Transaction was reverted by the contract. Check your inputs.");
    }

    // 2. Parse the exact tradeId from the event logs to avoid race conditions
    let newTradeId: bigint | null = null;

    for (const log of receipt.logs) {
      if (log.address.toLowerCase() !== contractAddress.toLowerCase()) {
        continue;
      }


      try {
        const decoded = decodeEventLog({
          abi: escrowAbi,
          eventName: 'TradeCreated',
          data: log.data,
          topics: log.topics
        });

        if (decoded.eventName === 'TradeCreated') {
          // 3. Extract the atomic tradeId directly from our event
          newTradeId = decoded.args.tradeId as bigint;
          break;
        }
      } catch (err) {
        // Safely ignore logs that belong to other events (like ERC20 Transfers)
      }
    }

    if (newTradeId === null) {
      throw new Error("Trade ID could not be parsed from transaction logs. Transaction may have failed silently.");
    }

    // Handle Successful Creation UI Updates
    hideAllViews();
    elHome.classList.remove('hidden');
    createTradeForm.classList.add('hidden'); // Hide the form
    createResultBox.classList.remove('hidden'); // Show result panel

    // Setup Link
    const escrowLink = `${window.location.origin}${window.location.pathname}#escrow${newTradeId.toString()}`;
    const linkInput = document.getElementById('shareable-link') as HTMLInputElement;
    linkInput.value = escrowLink;

    // Assign "Save Details" Event
    const btnSaveDetails = document.getElementById('btn-save-details')!;
    btnSaveDetails.onclick = () => {
      const detailsText = `=== EasyEscrow Trade Details ===\n\nTrade ID: ${newTradeId}\nNetwork: ${chainConfig.name}\n\nBuyer: ${currentUserAddress}\nSeller: ${seller}\nArbiter: ${arbiter}\n\nBase Amount: ${amountStr} ${token.symbol}\nArbiter Fee: ${feeStr} ${token.symbol}\n\nDirect Link:\n${escrowLink}\n`;

      const blob = new Blob([detailsText], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `escrow_${newTradeId}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    };

    // Assign "Open Escrow" Event
    const btnOpenEscrow = document.getElementById('btn-open-created-escrow')!;
    btnOpenEscrow.onclick = () => {
      window.location.hash = `#escrow${newTradeId}`;
    };

    // Clear form for next time
    createTradeForm.reset();

  } catch (error: any) {
    console.error("Transaction failed:", error);
    alert(`Failed: ${error.shortMessage || error.message}`);
    hideAllViews();
    elHome.classList.remove('hidden');
  }
});

// --- 5. Navigation Features & Interactions ---

document.getElementById('btn-create-another')?.addEventListener('click', () => {
  createResultBox.classList.add('hidden');
  createTradeForm.classList.remove('hidden');
});

// Open Modal logic
document.getElementById('btn-open-popup')?.addEventListener('click', () => {
  modalOpenEscrow.classList.remove('hidden');
  inputEscrowId.value = '';
  inputEscrowId.focus();
});

// Close Modal logic
document.getElementById('btn-cancel-modal')?.addEventListener('click', () => {
  modalOpenEscrow.classList.add('hidden');
});

// Confirm Modal logic -> Route to ID
document.getElementById('btn-confirm-modal')?.addEventListener('click', () => {
  const targetId = parseInt(inputEscrowId.value);
  if (!isNaN(targetId) && targetId > 0) {
    modalOpenEscrow.classList.add('hidden');
    window.location.hash = `#escrow${targetId}`;
  }
});

// Reset view to Home
document.getElementById('btn-new-escrow')?.addEventListener('click', () => {
  window.location.hash = '';
});

async function executeAction(functionName: string, args: any[]) {
  if (!currentChainId || !currentTradeId) return;
  const contractAddress = APP_CONFIG[currentChainId].escrowContractAddress as `0x${string}`;

  try {
    showLoading(`Executing ${functionName}...`);
    const hash = await writeContract(wagmiAdapter.wagmiConfig, {
      address: contractAddress,
      // Fixed TS2322: Bypass strict abi typing for dynamic function names
      abi: escrowAbi as any,
      functionName,
      args
    });

    showLoading("Waiting for transaction confirmation...");
    await waitForTransactionReceipt(wagmiAdapter.wagmiConfig, { hash });

    await loadEscrowTrade(currentTradeId);
  } catch (error: any) {
    console.error("Action failed:", error);
    alert(`Action failed: ${error.shortMessage || error.message}`);
    await loadEscrowTrade(currentTradeId);
  }
}

// Contract execution buttons
document.getElementById('btn-seller-deliver')?.addEventListener('click', () => executeAction('sellerDeliver', [BigInt(currentTradeId!)]));
document.getElementById('btn-arbiter-resolve-buyer')?.addEventListener('click', () => executeAction('resolveTrade', [BigInt(currentTradeId!), true]));
document.getElementById('btn-arbiter-resolve-seller')?.addEventListener('click', () => executeAction('resolveTrade', [BigInt(currentTradeId!), false]));
document.getElementById('btn-buyer-refund-seller')?.addEventListener('click', () => executeAction('sellerTimeoutRefund', [BigInt(currentTradeId!)]));
document.getElementById('btn-buyer-refund-arbiter')?.addEventListener('click', () => executeAction('emergencyRefundBuyer', [BigInt(currentTradeId!)]));

// --- Utils ---
function hideAllViews() { document.querySelectorAll('.view-state').forEach(el => el.classList.add('hidden')); }
function showLoading(text: string) { document.getElementById('loading-text')!.textContent = text; elLoading.classList.remove('hidden'); }
function parseTradeStatus(statusCode: number): string { return ['Awaiting Seller', 'Awaiting Arbiter', 'Completed', 'Refunded'][statusCode] || 'Unknown'; }

/**
 * Validates and converts an address to its checksum format.
 * Throws an error if the address is invalid.
 */
function validateAndChecksumAddress(address: string): `0x${string}` {
  try {
    // viem's getAddress validates the format and returns the checksummed version
    return getAddress(address);
  } catch (error) {
    throw new Error(`Invalid wallet address: ${address}`);
  }
}


document.getElementById('btn-copy-link')?.addEventListener('click', async () => {
  const linkInput = document.getElementById('shareable-link') as HTMLInputElement;
  try { await navigator.clipboard.writeText(linkInput.value); alert('Copied!'); } catch (err) { }
});