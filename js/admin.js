/*---------------------------------------------
 * Admin Dashboard JavaScript
 * Displays visitor data and analytics
 *--------------------------------------------*/

document.addEventListener('DOMContentLoaded', function() {
    'use strict';
    
    // DOM elements
    const totalVisitorsElement = document.getElementById('total-visitors');
    const totalPageViewsElement = document.getElementById('total-page-views');
    const avgSessionTimeElement = document.getElementById('avg-session-time');
    const mobileUsersElement = document.getElementById('mobile-users');
    const visitorsTableBody = document.getElementById('visitors-table-body');
    const browserStatsElement = document.getElementById('browser-stats');
    const pageStatsElement = document.getElementById('page-stats');
    const navItems = document.querySelectorAll('.admin-nav li');
    const adminPanels = document.querySelectorAll('.admin-panel');
    
    // API endpoint
    const API_BASE_URL = '/api';
    
    // Initialize dashboard
    updateStats();
    
    // Set up auto-refresh every 30 seconds
    setInterval(updateStats, 30000);
    
    // Set up navigation
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            const targetId = this.querySelector('a').getAttribute('href').substring(1);
            
            // Update active nav item
            navItems.forEach(navItem => navItem.classList.remove('active'));
            this.classList.add('active');
            
            // Show corresponding panel
            adminPanels.forEach(panel => {
                panel.classList.remove('active');
                if (panel.id === targetId) {
                    panel.classList.add('active');
                }
            });
        });
    });
    
    /**
     * Update all statistics on the dashboard
     */
    // In js/admin.js, replace updateStats and related functions:
function updateStats() {
    // Show loading state
    if (totalVisitorsElement) totalVisitorsElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    if (totalPageViewsElement) totalPageViewsElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    if (avgSessionTimeElement) avgSessionTimeElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    if (mobileUsersElement) mobileUsersElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    // Fetch all stats concurrently
    Promise.all([
        fetch(`${API_BASE_URL}/admin/total-visitors`).then(res => res.json()),
        fetch(`${API_BASE_URL}/admin/total-page-views`).then(res => res.json()),
        fetch(`${API_BASE_URL}/admin/avg-session-duration`).then(res => res.json()),
        fetch(`${API_BASE_URL}/admin/mobile-users`).then(res => res.json()),
        fetch(`${API_BASE_URL}/admin/recent-visitors`).then(res => res.json()),
        fetch(`${API_BASE_URL}/admin/browser-stats`).then(res => res.json()),
        fetch(`${API_BASE_URL}/admin/page-stats`).then(res => res.json()),
        fetch(`${API_BASE_URL}/admin/device-stats`).then(res => res.json()),
        fetch(`${API_BASE_URL}/admin/session-buckets`).then(res => res.json())
    ])
        .then(([totalVisitors, totalPageViews, avgSession, mobileUsers, recentVisitors, browserStats, pageStats, deviceStats, sessionBuckets]) => {
            // Update UI with the data
            updateDashboardWithData(
                totalVisitors.count,
                totalPageViews.count,
                avgSession.avg_duration,
                mobileUsers.percentage,
                recentVisitors,
                browserStats,
                pageStats,
                deviceStats,
                sessionBuckets
            );
        })
        .catch(error => {
            console.error('Error fetching admin data:', error);
            // Fallback to localStorage
            const visitors = JSON.parse(localStorage.getItem('portfolio_visitors')) || [];
            const pageViews = JSON.parse(localStorage.getItem('portfolio_pageviews')) || [];
            const sessionDurations = JSON.parse(localStorage.getItem('portfolio_sessionDurations')) || [];
            updateDashboardWithData(
                visitors.length,
                pageViews.length,
                sessionDurations.length > 0 ? sessionDurations.reduce((sum, d) => sum + d, 0) / sessionDurations.length : 0,
                visitors.length > 0 ? Math.round((visitors.filter(v => v.device === 'Mobile').length / visitors.length) * 100) : 0,
                visitors,
                computeBrowserStats(visitors),
                computePageStats(pageViews),
                computeDeviceStats(visitors),
                computeSessionBuckets(sessionDurations)
            );
        });
}

function updateDashboardWithData(totalVisitors, totalPageViews, avgSessionDuration, mobilePercentage, visitors, browserStats, pageStats, deviceStats, sessionBuckets) {
    // Update summary stats
    totalVisitorsElement.textContent = totalVisitors;
    totalPageViewsElement.textContent = totalPageViews;
    avgSessionTimeElement.textContent = formatTime(Math.round(avgSessionDuration));
    mobileUsersElement.textContent = `${mobilePercentage}%`;

    // Populate visitors table
    populateVisitorsTable(visitors);

    // Update browser and page stats
    updateBrowserStats(browserStats);
    updatePageStats(pageStats);

    // Initialize charts
    initDeviceChart(deviceStats);
    initSessionChart(sessionBuckets);
}

// Helper functions for localStorage fallback
function computeBrowserStats(visitors) {
    const browserCounts = {};
    visitors.forEach(visitor => {
        const browser = visitor.browser || 'Unknown';
        browserCounts[browser] = (browserCounts[browser] || 0) + 1;
    });
    return Object.entries(browserCounts).map(([browser, count]) => ({ browser, count }));
}

function computePageStats(pageViews) {
    const pageCounts = {};
    pageViews.forEach(view => {
        const page = view.page || '/';
        pageCounts[page] = (pageCounts[page] || 0) + 1;
    });
    return Object.entries(pageCounts).map(([page, count]) => ({ page, count }));
}

function computeDeviceStats(visitors) {
    const deviceCounts = {};
    visitors.forEach(visitor => {
        const device = visitor.device || 'Unknown';
        deviceCounts[device] = (deviceCounts[device] || 0) + 1;
    });
    return Object.entries(deviceCounts).map(([device, count]) => ({ device, count }));
}

function computeSessionBuckets(sessionDurations) {
    const buckets = {
        '< 1 min': 0,
        '1-3 min': 0,
        '3-5 min': 0,
        '5-10 min': 0,
        '> 10 min': 0
    };
    sessionDurations.forEach(duration => {
        if (duration < 60) buckets['< 1 min']++;
        else if (duration < 180) buckets['1-3 min']++;
        else if (duration < 300) buckets['3-5 min']++;
        else if (duration < 600) buckets['5-10 min']++;
        else buckets['> 10 min']++;
    });
    return Object.entries(buckets).map(([bucket, count]) => ({ bucket, count }));
}

// Update initDeviceChart to use API data
function initDeviceChart(deviceStats) {
    const deviceChartCanvas = document.getElementById('device-chart');
    if (deviceChartCanvas) {
        const ctx = deviceChartCanvas.getContext('2d');
        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: deviceStats.map(stat => stat.device),
                datasets: [{
                    data: deviceStats.map(stat => stat.count),
                    backgroundColor: ['#9D4EDD', '#5A189A', '#3C096C'],
                    borderColor: '#121212',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { color: '#CCCCCC', padding: 15 }
                    }
                }
            }
        });
    }
}

// Update initSessionChart to use API data
function initSessionChart(sessionBuckets) {
    const sessionChartCanvas = document.getElementById('session-chart');
    if (sessionChartCanvas) {
        const ctx = sessionChartCanvas.getContext('2d');
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: sessionBuckets.map(stat => stat.bucket),
                datasets: [{
                    label: 'Number of Sessions',
                    data: sessionBuckets.map(stat => stat.count),
                    backgroundColor: '#9D4EDD',
                    borderColor: '#5A189A',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true, ticks: { color: '#CCCCCC' }, grid: { color: 'rgba(255, 255, 255, 0.05)' } },
                    x: { ticks: { color: '#CCCCCC' }, grid: { color: 'rgba(255, 255, 255, 0.05)' } }
                },
                plugins: { legend: { labels: { color: '#CCCCCC' } } }
            }
        });
    }
}

// Update updateBrowserStats to use API data
function updateBrowserStats(browserStats) {
    browserStatsElement.innerHTML = '';
    const total = browserStats.reduce((sum, stat) => sum + stat.count, 0);
    browserStats.forEach(stat => {
        const percentage = total > 0 ? Math.round((stat.count / total) * 100) : 0;
        const statItem = document.createElement('div');
        statItem.className = 'stat-item';
        let iconClass = 'fas fa-globe';
        if (stat.browser === 'Chrome') iconClass = 'fab fa-chrome';
        else if (stat.browser === 'Firefox') iconClass = 'fab fa-firefox';
        else if (stat.browser === 'Safari') iconClass = 'fab fa-safari';
        else if (stat.browser === 'Edge') iconClass = 'fab fa-edge';
        else if (stat.browser === 'Opera') iconClass = 'fab fa-opera';
        else if (stat.browser === 'Internet Explorer') iconClass = 'fab fa-internet-explorer';
        statItem.innerHTML = `
            <div class="stat-name"><i class="${iconClass}"></i> ${stat.browser}</div>
            <div class="stat-value">${percentage}%</div>
            <div class="progress-container"><div class="progress-bar" style="width: ${percentage}%"></div></div>
        `;
        browserStatsElement.appendChild(statItem);
    });
}

// Update updatePageStats to use API data
function updatePageStats(pageStats) {
    pageStatsElement.innerHTML = '';
    const total = pageStats.reduce((sum, stat) => sum + stat.count, 0);
    pageStats.forEach(stat => {
        const percentage = total > 0 ? Math.round((stat.count / total) * 100) : 0;
        const statItem = document.createElement('div');
        statItem.className = 'stat-item';
        let pageName = stat.page === '/' ? 'Home' : stat.page.split('/').pop().split('.')[0];
        pageName = pageName.charAt(0).toUpperCase() + pageName.slice(1);
        statItem.innerHTML = `
            <div class="stat-name"><i class="fas fa-file"></i> ${pageName}</div>
            <div class="stat-value">${stat.count} views</div>
            <div class="progress-container"><div class="progress-bar" style="width: ${percentage}%"></div></div>
        `;
        pageStatsElement.appendChild(statItem);
    });
}

                          // In js/admin.js, add to the bottom:
function cleanupOldData() {
    fetch(`${API_BASE_URL}/admin/cleanup`, { method: 'POST' })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                alert('Old data cleaned up successfully');
                updateStats(); // Refresh stats after cleanup
            } else {
                alert('Failed to clean up data');
            }
        })
        .catch(error => {
            console.error('Error cleaning up data:', error);
            alert('Error cleaning up data');
        });
}
