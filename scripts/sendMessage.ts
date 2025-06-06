import { Address, toNano } from '@ton/core';
import { MyContract } from '../wrappers/MyContract';
import { NetworkProvider, sleep } from '@ton/blueprint';

export async function run(provider: NetworkProvider, args: string[]) {
    const ui = provider.ui();

    const address = Address.parse(
        args.length > 0 ? args[0] : await ui.input('kQBmfyvtydi0NBEofnMQHnbPcQW23jsD4SS2EnpoPU4C9EBh'),
    );

    if (!(await provider.isContractDeployed(address))) {
        ui.write(`Error: Contract at address ${address} is not deployed!`);
        return;
    }

    const myContract = provider.open(MyContract.createFromAddress(address));

    const MessageBefore = await myContract.getContractData();
    let random = Math.floor(Math.random() * 100);

    //await myContract.sendMessageEdit(provider.sender(), toNano('0.01'), `TEST MESSAGE ONCHAIN №${random}`.toString());
    //await myContract.sendDeleteMessage(provider.sender(), toNano('0.02'));
    await myContract.sendChangeAccess(provider.sender(), toNano('0.02'), 0);

    ui.write('Waiting for message to edit...');

    let MessageAfter = await myContract.getContractData();
    let attempt = 1;
    while (MessageAfter.message === MessageBefore.message) {
        ui.setActionPrompt(`Attempt ${attempt}`);
        await sleep(2000);
        MessageAfter = await myContract.getContractData();
        attempt++;
    }

    ui.clearActionPrompt();
    ui.write('Counter increased successfully!');
    console.log(
        `FULL DATA:\nOwner: ${MessageAfter.owner}\nAccess: ${MessageAfter.access}\nRecent sender: ${MessageAfter.recent_sender}\nMessage: ${MessageAfter.message}\nMessage time: ${MessageAfter.message_time}`,
    );
}
