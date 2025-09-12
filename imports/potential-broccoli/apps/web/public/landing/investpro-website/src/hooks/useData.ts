import { useState, useEffect } from 'react';

// Generic hook for fetching JSON data
export const useData = <T>(endpoint: string) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/data/${endpoint}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch ${endpoint}`);
        }
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [endpoint]);

  return { data, loading, error };
};

// Specific hooks for different data types
export const useBlogPosts = () => {
  return useData<{
    featured: any;
    posts: any[];
    categories: any[];
  }>('blog-posts.json');
};

export const useMarketData = () => {
  return useData<{
    realtime: any;
    topStocks: any[];
    mutualFunds: any[];
    marketStats: any;
  }>('market-data.json');
};

export const useTestimonials = () => {
  return useData<{
    testimonials: any[];
    successStories: any[];
  }>('testimonials.json');
};

export const usePricingPlans = () => {
  return useData<{
    plans: any[];
    features: any;
  }>('pricing-plans.json');
};

export const useInvestmentProducts = () => {
  return useData<{
    stocks: any;
    mutualFunds: any;
    etfs: any[];
  }>('investment-products.json');
};

export const useEducationalContent = () => {
  return useData<{
    investmentGuide: any;
    glossary: any[];
    faqs: any[];
  }>('educational-content.json');
};