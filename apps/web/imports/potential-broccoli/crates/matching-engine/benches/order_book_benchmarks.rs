//! Benchmarks for matching engine performance
//! 
//! This module provides comprehensive performance testing for the matching engine,
//! measuring key operations under various load conditions.

use criterion::{black_box, criterion_group, criterion_main, Criterion, BenchmarkId};
use matching_engine::{LimitOrderBook, Order, OrderSide, Price, Quantity, types::{OrderId, UserId}};
use rust_decimal::Decimal;
use std::time::Duration;

fn create_test_order(side: OrderSide, price_cents: i64, quantity: u64) -> Order {
    Order::new(
        OrderId::new(),
        UserId::new("benchmark_user".to_string()),
        side,
        Price::from_cents(price_cents).unwrap(),
        Quantity::new(quantity).unwrap(),
    )
}

/// Benchmark basic order book operations
fn bench_order_operations(c: &mut Criterion) {
    let mut group = c.benchmark_group("order_operations");
    group.measurement_time(Duration::from_secs(10));
    
    // Benchmark order addition
    group.bench_function("add_order", |b| {
        let mut book = LimitOrderBook::new("AAPL".to_string()).unwrap();
        let mut counter = 0u64;
        
        b.iter(|| {
            counter += 1;
            let order = create_test_order(
                if counter % 2 == 0 { OrderSide::Buy } else { OrderSide::Sell },
                15000 + (counter as i64 % 100) - 50, // Price variation around $150
                100,
            );
            black_box(book.add_order(order).unwrap());
        });
    });
    
    // Benchmark order cancellation
    group.bench_function("cancel_order", |b| {
        let mut book = LimitOrderBook::new("AAPL".to_string()).unwrap();
        let mut order_ids = Vec::new();
        
        // Pre-populate with orders
        for i in 0..1000 {
            let order = create_test_order(OrderSide::Buy, 15000 - i, 100);
            order_ids.push(order.id);
            book.add_order(order).unwrap();
        }
        
        let mut index = 0;
        b.iter(|| {
            if index < order_ids.len() {
                let order_id = order_ids[index];
                index += 1;
                black_box(book.cancel_order(order_id));
            }
        });
    });
    
    group.finish();
}

/// Benchmark query operations (Phase 1b focus)
fn bench_query_operations(c: &mut Criterion) {
    let mut group = c.benchmark_group("query_operations");
    
    // Setup order book with various sizes
    for size in [100, 1000, 10000].iter() {
        let mut book = LimitOrderBook::new("AAPL".to_string()).unwrap();
        
        // Add orders at different price levels
        for i in 0..*size {
            let buy_order = create_test_order(OrderSide::Buy, 15000 - i, 100);
            let sell_order = create_test_order(OrderSide::Sell, 15001 + i, 100);
            book.add_order(buy_order).unwrap();
            book.add_order(sell_order).unwrap();
        }
        
        // Benchmark best_bid()
        group.bench_with_input(
            BenchmarkId::new("best_bid", size),
            size,
            |b, _| {
                b.iter(|| black_box(book.best_bid()));
            },
        );
        
        // Benchmark best_ask()
        group.bench_with_input(
            BenchmarkId::new("best_ask", size),
            size,
            |b, _| {
                b.iter(|| black_box(book.best_ask()));
            },
        );
        
        // Benchmark spread()
        group.bench_with_input(
            BenchmarkId::new("spread", size),
            size,
            |b, _| {
                b.iter(|| black_box(book.spread()));
            },
        );
        
        // Benchmark market_depth()
        for depth_levels in [5, 10, 20].iter() {
            group.bench_with_input(
                BenchmarkId::new("market_depth", format!("{}orders_{}levels", size, depth_levels)),
                &(*size, *depth_levels),
                |b, (_, levels)| {
                    b.iter(|| black_box(book.market_depth(*levels)));
                },
            );
        }
    }
    
    group.finish();
}

/// Benchmark order matching performance
fn bench_order_matching(c: &mut Criterion) {
    let mut group = c.benchmark_group("order_matching");
    group.measurement_time(Duration::from_secs(15));
    
    // Benchmark matching with different order book depths
    for depth in [10, 100, 1000].iter() {
        group.bench_with_input(
            BenchmarkId::new("cross_spread_match", depth),
            depth,
            |b, &depth| {
                b.iter_custom(|iters| {
                    let mut total_duration = Duration::new(0, 0);
                    
                    for _ in 0..iters {
                        let mut book = LimitOrderBook::new("AAPL".to_string()).unwrap();
                        
                        // Add resting orders
                        for i in 0..depth {
                            let sell_order = create_test_order(OrderSide::Sell, 15001 + i, 100);
                            book.add_order(sell_order).unwrap();
                        }
                        
                        // Time the matching operation
                        let start = std::time::Instant::now();
                        let buy_order = create_test_order(OrderSide::Buy, 15001, 100);
                        black_box(book.add_order(buy_order).unwrap());
                        total_duration += start.elapsed();
                    }
                    
                    total_duration
                });
            },
        );
    }
    
    group.finish();
}

/// Benchmark serialization performance for snapshots
fn bench_serialization(c: &mut Criterion) {
    let mut group = c.benchmark_group("serialization");
    
    for size in [100, 1000, 5000].iter() {
        let mut book = LimitOrderBook::new("AAPL".to_string()).unwrap();
        
        // Populate order book
        for i in 0..*size {
            let buy_order = create_test_order(OrderSide::Buy, 15000 - i, 100);
            let sell_order = create_test_order(OrderSide::Sell, 15001 + i, 100);
            book.add_order(buy_order).unwrap();
            book.add_order(sell_order).unwrap();
        }
        
        // Benchmark JSON serialization
        group.bench_with_input(
            BenchmarkId::new("json_serialize", size),
            &book,
            |b, book| {
                b.iter(|| {
                    black_box(serde_json::to_string(book).unwrap());
                });
            },
        );
        
        // Benchmark JSON deserialization
        let json_data = serde_json::to_string(&book).unwrap();
        group.bench_with_input(
            BenchmarkId::new("json_deserialize", size),
            &json_data,
            |b, json| {
                b.iter(|| {
                    black_box(serde_json::from_str::<LimitOrderBook>(json).unwrap());
                });
            },
        );
    }
    
    group.finish();
}

/// High-frequency trading simulation benchmark
fn bench_hft_simulation(c: &mut Criterion) {
    let mut group = c.benchmark_group("hft_simulation");
    group.measurement_time(Duration::from_secs(20));
    
    group.bench_function("rapid_order_flow", |b| {
        b.iter_custom(|iters| {
            let mut total_duration = Duration::new(0, 0);
            
            for _ in 0..iters {
                let mut book = LimitOrderBook::new("AAPL".to_string()).unwrap();
                let mut order_counter = 0u64;
                
                let start = std::time::Instant::now();
                
                // Simulate 1000 rapid orders
                for _ in 0..1000 {
                    order_counter += 1;
                    
                    // Mix of orders: 40% buy, 40% sell, 20% cancels
                    match order_counter % 5 {
                        0 | 1 => {
                            // Buy order
                            let order = create_test_order(
                                OrderSide::Buy,
                                15000 - (order_counter as i64 % 50),
                                100 + (order_counter % 500),
                            );
                            book.add_order(order).unwrap();
                        },
                        2 | 3 => {
                            // Sell order  
                            let order = create_test_order(
                                OrderSide::Sell,
                                15001 + (order_counter as i64 % 50),
                                100 + (order_counter % 500),
                            );
                            book.add_order(order).unwrap();
                        },
                        4 => {
                            // Cancel random order (if any exist)
                            if book.order_count() > 0 {
                                // In real scenario, we'd track order IDs
                                // For benchmark, just query operations
                                black_box(book.best_bid());
                                black_box(book.best_ask());
                                black_box(book.market_depth(5));
                            }
                        },
                        _ => unreachable!(),
                    }
                }
                
                total_duration += start.elapsed();
            }
            
            total_duration
        });
    });
    
    group.finish();
}

criterion_group!(
    benches, 
    bench_order_operations,
    bench_query_operations, 
    bench_order_matching,
    bench_serialization,
    bench_hft_simulation
);
criterion_main!(benches);