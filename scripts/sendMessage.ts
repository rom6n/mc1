import { Address, toNano } from '@ton/core';
import { MyContract } from '../wrappers/MyContract';
import { NetworkProvider, sleep } from '@ton/blueprint';

export async function run(provider: NetworkProvider, args: string[]) {
    const ui = provider.ui();

    const address = Address.parse(args.length > 0 ? args[0] : await ui.input('MyContract address'));

    if (!(await provider.isContractDeployed(address))) {
        ui.write(`Error: Contract at address ${address} is not deployed!`);
        return;
    }

    const myContract = provider.open(MyContract.createFromAddress(address));

    const MessageBefore = await myContract.getContractData();

    /*await myContract.edit_message(
        provider.sender(),
        toNano("0.05"),
        "TEST MESSAGE".toString(),
    );*/

    ui.write('Waiting for message to edit...');

    let MessageAfter = await myContract.getContractData();
    let attempt = 1;
    while (MessageAfter === MessageBefore) {
        ui.setActionPrompt(`Attempt ${attempt}`);
        await sleep(2000);
        MessageAfter = await myContract.getContractData();
        attempt++;
    }

    ui.clearActionPrompt();
    ui.write('Counter increased successfully!');
}
