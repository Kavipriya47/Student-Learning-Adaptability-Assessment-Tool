// In-memory cache for analytics
const analyticsCache = new Map();
const CACHE_TTL = 30 * 1000; // 30 seconds

const getCachedAnalytics = (batchId) => {
    const cached = analyticsCache.get(batchId);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
        return cached.data;
    }
    return null;
};

const setAnalyticsCache = (batchId, data) => {
    analyticsCache.set(batchId, {
        timestamp: Date.now(),
        data: data
    });
};

const clearAnalyticsCache = (batchId) => {
    if (batchId) {
        analyticsCache.delete(batchId.toString());
    } else {
        analyticsCache.clear();
    }
};

module.exports = {
    getCachedAnalytics,
    setAnalyticsCache,
    clearAnalyticsCache
};
