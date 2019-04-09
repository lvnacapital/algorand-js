# algorand-js

`algorand-js` is a CLI application that abstracts low-level Algorand node operations.

## Installation

To install `algorand-js` run the following command in the project's directory:

```
$ npm install
```

## Configuration

To configure `algorand-js`, a `.env` can be placed in the project directory.

```bash
ALGOD_TOKEN=374de74fa794248762e5ac17c8b39f19a05  # the `algod' process token
KMD_TOKEN=be84aa55f61665645ed680b27ee15f11653    # the `kmd' process token
HOSTNAME=127.0.0.1                               # the Algorand node's IP (optional; defaults shown)
ALGOD_PORT=8080                                  # the `algod' process port (optional; defaults shown)
KMD_PORT=7833                                    # the `kmd' process port (optional; defaults shown)
```

## Usage

Run `algorand-js <COMMAND> <FLAGS>`. Running `algorand-js` or `algorand-js -h` will show usage and a list of commands.

## Examples

### status:

```
$ npm start -- -s
`algod' Status
--------------
Last committed block: 348927
Time since last block: 3.4s
Last consensus protocol: v4
Next consensus protocol: v4
Round for next consensus protocol: 348928
Next consensus protocol supported: true

Sign and Submit Transaction from Existing Wallet and Account
------------------------------------------------------------
Got wallets list:
[1] JSWallet
Pick the wallet to use [1]: 1

Type the 'JSWallet' wallet's password: 

Got keys list:
[1] MYPI256EXJQIMTV3NHX2BNVAPL7WRXCOOJ67X4WE536RSUMKEZVSP4IBI4
Pick the account address to send from [1]: 1

Specify the account address to send to: KI6TMKHUQOGJ7EDZLOWFOGHBBWBIMBMKONMS565X7NSOFMAM6S2EK4GBHQ

Specify the amount to be transferred: 1000

Specify some note text (optional):

Signing transaction:
{ from: 'MYPI256EXJQIMTV3NHX2BNVAPL7WRXCOOJ67X4WE536RSUMKEZVSP4IBI4',
  to: 'KI6TMKHUQOGJ7EDZLOWFOGHBBWBIMBMKONMS565X7NSOFMAM6S2EK4GBHQ',
  fee: 101,
  amount: 1000,
  firstRound: 348113,
  lastRound: 349113,
  genesisID: 'testnet-v31.0',
  note: Uint8Array [] }

Submitting transaction...
Transaction: TX-VAQEFNTC5UGV4IPNO4Y3M47YRZMDPARQCHH4I3PBK2J2WEOV5J4Q
```
