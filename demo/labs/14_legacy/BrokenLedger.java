/**
 * SIMULATION: "The Broken Ledger"
 * JOB TRACK: Backend Engineer
 * BUG: Floating Point Precision (IEEE 754)
 */
public class BrokenLedger {

    // <--- BUG 1: Using 'double' for currency. NEVER do this.
    // 0.1 + 0.2 = 0.30000000000000004
    private double bankVault = 0.00;

    public void processTransaction(float amount) {
        // <--- BUG 2: Mixing float and double adds more precision noise
        bankVault += amount;
    }

    public void audit() {
        System.out.printf("Vault Balance: %.20f\n", bankVault);
    }

    public static void main(String[] args) {
        BrokenLedger ledger = new BrokenLedger();

        // Simulate 10,000 micro-transactions of $0.10
        // Expected: $1,000.00
        for (int i = 0; i < 10000; i++) {
            ledger.processTransaction(0.10f); 
        }

        // Output will NOT be 1000.00
        // It will be something like 999.999... or 1000.0001...
        ledger.audit();
        
        double expected = 1000.00;
        if (ledger.bankVault != expected) {
            System.out.println("CRITICAL FAILURE: Money has vanished (or appeared)!");
            System.out.println("Difference: " + (ledger.bankVault - expected));
        }
    }
}
