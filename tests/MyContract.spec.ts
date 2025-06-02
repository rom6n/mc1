import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { address, Cell, toNano } from '@ton/core';
import { MyContract } from '../wrappers/MyContract';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';

describe('MyContract', () => {
    let code: Cell;

    beforeAll(async () => {
        code = await compile('MyContract');
    });

    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let myContract: SandboxContract<MyContract>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        myContract = blockchain.openContract(
            MyContract.createFromConfig(
                {
                    owner_address: address("0QDU46qYz4rHAJhszrW9w6imF8p4Cw5dS1GpPTcJ9vqNSmnf"),
                    access: 1,
                    recent_sender_address: address("0QDU46qYz4rHAJhszrW9w6imF8p4Cw5dS1GpPTcJ9vqNSmnf"),
                    message_text: "INITIAL MESSAGE".toString(),
                    message_time: Date.now(),
                },
                code
            )
        );

        deployer = await blockchain.treasury('deployer');

        const deployResult = await myContract.sendDeploy(deployer.getSender(), toNano('0.05'));

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: myContract.address,
            deploy: true,
            success: true,
        });

        
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and myConract are ready to use
    });

    it('should edit message', async () => {
        let random = Math.floor(Math.random() * 100);
        const sender = await blockchain.treasury("sender" + random)
        const messageResult = await myContract.sendMessageEdit(sender.getSender(), toNano(0.05), `TEST MESSAGE ${random}`, random);
        expect(messageResult.transactions).toHaveTransaction({
            from: sender.address,
            to: myContract.address,
            success: true,
        })

        const {owner, message, message_time, recent_sender, access} = await myContract.getContractData();
        let current_time = new Date(message_time);
        console.log(`Текущее сообщение: ${message}\nВремя: ${current_time}`);

    });

});
