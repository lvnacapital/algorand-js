/* eslint-disable no-console */
const readlineSync = require('readline-sync');
const algosdk = require('algosdk');

let walletId = null;
let walletHandle = null;

// Creating a New Wallet and Account Using `kmd'
// The following example creates a wallet, and generates an account
// within that wallet using the kmd.
// Created wallet. 895bad84b32bbffa28c2c069d6b49e9f
// Got wallet handle. 7c851f23a5ccf3b9.720b234ca57648b7bde1c1b1557c2be476da621f49bde47e8ddd01e254d7917a
// Created new account. MYPI256EXJQIMTV3NHX2BNVAPL7WRXCOOJ67X4WE536RSUMKEZVSP4IBI4
function createWallet(kmdClient) {
    let walletName = process.env.JS_WALLET;
    let walletPassword = process.env.JS_WALLET_PASSWORD;

    if (!walletName) {
        walletName = readlineSync.question('Specify a wallet name [default: JSWallet]: ', { defaultInput: 'JSWallet' });
    }
    if (!walletPassword) {
        walletPassword = readlineSync.question('Specify a wallet password: ', { hideEchoBack: true, mask: '' });
    }
    // console.log(walletName);
    // console.log(walletPassword);

    (async () => {
        // prettier-ignore
        walletId = (await kmdClient.createWallet(process.env.JS_WALLET, process.env.JS_WALLET_PASSWORD, '', 'sqlite')).wallet.id;
        console.log('Created wallet: ', walletId);

        walletHandle = (await kmdClient.initWalletHandle(walletId, process.env.JS_WALLET_PASSWORD)).wallet_handle_token;
        console.log('Got wallet handle: ', walletHandle);

        const { address } = await kmdClient.generateKey(walletHandle);
        console.log('Created new account: ', address);
    })().catch((e) => {
        console.log(e.error.text);
    });
}

// Backing Up and Restoring a Wallet
// You can export a master derivation key from the wallet and convert
// it to a mnemonic phrase in order to back up any wallet generated
// accounts. This backup phrase will only allow you to recover
// wallet-generated keys; if you import an external key into a
// kmd-managed wallet, you'll need to back up that key by itself in
// order to recover it.
function backupWallet(kmdClient) {
    (async () => {
        let walletName = process.env.JS_WALLET;
        let walletPassword = process.env.JS_WALLET_PASSWORD;

        if (!walletName) {
            // prettier-ignore
            walletName = readlineSync.question('Specify a wallet to backup [default: JSWallet]: ', { defaultInput: 'JSWallet' });
        }
        if (!walletPassword) {
            walletPassword = readlineSync.question('Type the wallet password: ', { hideEchoBack: true, mask: '' });
        }
        // console.log(walletName);
        // console.log(walletPassword);

        // Get a list of the wallets and find the one we are looking for
        walletId = null;
        const { wallets } = await kmdClient.listWallets();
        console.log('List Wallet: ', wallets);
        wallets.forEach((wallet) => {
            console.log(wallet.name);
            if (wallet.name === walletName) {
                walletId = wallet.id;
            }
        });

        // Get a wallet handle
        walletHandle = (await kmdClient.initWalletHandle(walletId, walletPassword)).wallet_handle_token;
        console.log('Got wallet handle: ', walletHandle);

        // Export the master derivation key
        const mdk = (await kmdClient.exportMasterDerivationKey(walletHandle, walletPassword)).master_derivation_key;
        console.log('mdk: ', mdk);

        // Get backup phrase to store offline in a safe place
        console.log(algosdk.masterDerivationKeyToMnemonic(mdk));
    })().catch((e) => {
        console.log(e.error.text);
    });
}

// Recover a Wallet
// To restore a wallet, convert the phrase to a key and pass it to
// CreateWallet. This call will fail if the wallet already exists.
function recoverWallet(kmdClient) {
    (async () => {
        // Get the master get from the backup phrase
        let mn = process.env.JS_WALLET_MNEMONIC;
        if (!mn) {
            mn = readlineSync.question('Specify the wallet mnemonic: ');
        }
        const mdk = await algosdk.mnemonicToMasterDerivationKey(mn);
        console.log(mdk);

        let walletName = process.env.RECOVERED_WALLET;
        let walletPassword = process.env.RECOVERED_WALLET_PASSWORD;
        if (!walletName) {
            // prettier-ignore
            walletName = readlineSync.question('Specify a recovered wallet name [default: RecoveredWallet]: ', { defaultInput: 'RecoveredWallet' });
        }
        if (!walletPassword) {
            walletPassword = readlineSync.question('Specify a wallet password: ', { hideEchoBack: true, mask: '' });
        }
        // Create the wallet using the master derivation key
        walletId = (await kmdClient.createWallet(walletName, walletPassword, mdk)).wallet.id;
        console.log(walletId);

        // Get a wallet handle
        walletHandle = (await kmdClient.initWalletHandle(walletId, walletPassword)).wallet_handle_token;
        console.log('Got wallet handle: ', walletHandle);

        // Generate 1 address but could generate multiple accounts.
        const { address } = await kmdClient.generateKey(walletHandle);
        console.log('Created new account: ', address);
    })().catch((e) => {
        console.log(e.error.text);
    });
}

module.exports = { createWallet, backupWallet, recoverWallet };
