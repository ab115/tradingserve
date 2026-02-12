import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * SIMULATION: "The Phantom Trade"
 * JOB TRACK: Quant Developer
 * BUG: Race Condition / Not Thread Safe
 */
public class PhantomOrderBook {

    // <--- BUG 1: HashMap is not thread-safe. Concurrent access causes data corruption.
    private Map<String, Double> userBalances = new HashMap<>();
    
    // <--- BUG 2: ArrayList is not thread-safe.
    private List<String> orderHistory = new ArrayList<>();

    public PhantomOrderBook() {
        userBalances.put("Alice", 1000.0);
        userBalances.put("Bob", 1000.0);
    }

    // <--- BUG 3: Missing 'synchronized' keyword on critical section
    public void executeTrade(String buyer, String seller, double amount) {
        if (!userBalances.containsKey(buyer) || !userBalances.containsKey(seller)) return;

        double buyerBal = userBalances.get(buyer);
        double sellerBal = userBalances.get(seller);

        if (buyerBal >= amount) {
            // Context Switch likely here during high concurrency
            userBalances.put(buyer, buyerBal - amount);
            userBalances.put(seller, sellerBal + amount);
            
            orderHistory.add("Trade: " + buyer + " -> " + seller + " : " + amount);
        }
    }

    public static void main(String[] args) {
        PhantomOrderBook book = new PhantomOrderBook();
        
        // Simulate High Frequency Trading (10 threads)
        for (int i = 0; i < 10; i++) {
            new Thread(() -> {
                for (int j = 0; j < 100; j++) {
                    book.executeTrade("Alice", "Bob", 10.0);
                }
            }).start();
        }
        
        // Expected: Alice should have 0.0 (100 * 10 * 10 = 10000? No, 10 threads * 100 trades * 10$ = 10,000... wait setup is 1000)
        // With bugs: Alice might end up with negative balance.
    }
}
