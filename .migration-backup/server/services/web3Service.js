const { ethers } = require('ethers');
const supabase = require('./supabase');

/**
 * SERVIÇO: WEB3_SETTLEMENT
 * Ponte entre o Ledger Digital (Supabase) e a Liquidez On-chain.
 */
class Web3Service {
    static async settleEarnings(userId) {
        // 1. Soma saldo faturado e não liquidado
        const { data: earnings } = await supabase
            .rpc('get_unsettled_revenue', { u_id: userId });

        if (!earnings || earnings <= 0) return { success: false, msg: "Nada a liquidar." };

        // 2. Conexão com o Contrato GXEonSettlement
        const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
        const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
        const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, ABI, wallet);

        try {
            // 3. Executa o Claim no Smart Contract
            const tx = await contract.releaseFunds(userId, ethers.parseEther(earnings.toString()));
            await tx.wait();

            // 4. Marca como liquidado no Supabase
            await supabase.from('billing_transactions')
                .update({ status: 'onchain_settled' })
                .eq('user_id', userId).eq('status', 'completed');

            return { success: true, tx_hash: tx.hash };
        } catch (error) {
            throw new Error(`WEB3_SETTLEMENT_FAILED: ${error.message}`);
        }
    }
}

module.exports = Web3Service;
