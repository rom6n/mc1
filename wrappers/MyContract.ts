import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode, toNano } from '@ton/core';

export type MyContractConfig = {
    owner_address: Address;
    access: number;
    recent_sender_address: Address;
    message_text: string;
    message_time: number;
};

export function myContractConfigToCell(config: MyContractConfig): Cell {
    const msg_text = beginCell().storeStringTail(config.message_text).endCell();
    return beginCell()
        .storeAddress(config.owner_address)
        .storeUint(config.access, 32)
        .storeAddress(config.recent_sender_address)
        .storeRef(msg_text)
        .storeUint(config.message_time, 64)
        .endCell();
}

export const Opcodes = {
    edit_message: 10,
    delete_message: 11,
    change_access: 12,
    transfer_ownership: 13,
    deposit: 1,
    withdraw: 2,
};

export class MyContract implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new MyContract(address);
    }

    static createFromConfig(config: MyContractConfig, code: Cell, workchain = 0) {
        const data = myContractConfigToCell(config);
        const init = { code, data };
        return new MyContract(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    async sendMessageEdit(
        provider: ContractProvider,
        via: Sender,
        value: bigint,
        new_message: string,
        queryID?: number,
    ) {
        const message_cell = beginCell().storeStringTail(new_message).endCell();
        const msg_body = beginCell()
            .storeUint(10, 32)
            .storeUint(queryID ?? 0, 64)
            .storeRef(message_cell)
            .endCell();

        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: msg_body
        });
    }

    async deleteMessage(
        provider: ContractProvider,
        via: Sender,
        value: bigint,
        queryID?: number,
    ) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(Opcodes.delete_message, 32)
                .storeUint(queryID ?? 0, 64)
                .endCell(),
        });
    }

    async changeAccess(
        provider: ContractProvider,
        via: Sender,
        value: bigint,
        new_access: number,
        queryID?: number,
    ) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(Opcodes.edit_message, 32)
                .storeUint(queryID ?? 0, 64)
                .storeUint(new_access, 32) // 0 - запрещено всем кроме владельца, -1 - разрешено
                .endCell(),
        });
    }

    async transferOwnership(
        provider: ContractProvider,
        via: Sender,
        value: bigint,
        transfer_to: Address,
        queryID?: number,
    ) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(Opcodes.edit_message, 32)
                .storeUint(queryID ?? 0, 64)
                .storeAddress(transfer_to)
                .endCell(),
        });
    }

    async sendDeposit(
        provider: ContractProvider,
        via: Sender,
        value: bigint,
        queryID?: number,
    ) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(Opcodes.edit_message, 32)
                .storeUint(queryID ?? 0, 64)
                .endCell(),
        });
    }

    async sendWithdraw(
        provider: ContractProvider,
        via: Sender,
        value: bigint,
        amount: number,
        queryID?: number,
    ) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(Opcodes.edit_message, 32)
                .storeUint(queryID ?? 0, 64)
                .storeCoins(toNano(amount))
                .endCell(),
        });
    }

    async getContractData(provider: ContractProvider) {
        const {stack} = await provider.get('get_contract_data', []);
        return {
            owner: stack.readAddress(),
            access: stack.readNumber(),
            recent_sender: stack.readAddress(),
            message: stack.readString(),
            message_time: stack.readNumber(),
        }
    }

    async getBalance(provider: ContractProvider) {
        const result = await provider.get('balance', []);
        return result.stack.readBigNumber();
    }
}
