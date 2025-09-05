document.addEventListener('DOMContentLoaded', function() {
    'use strict';
    
    // DOM elements
    const totalVisitorsElement = document.getElementById('total-visitors');
    const totalPageViewsElement = document.getElementById('total-page-views');
    const mobileUsersElement = document.getElementById('mobile-users');
    const pcUsersElement = document.getElementById('pc-users');
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
    
    // Handle navigation
    function showPanel(targetId) {
        // Update active nav item
        navItems.forEach(navItem => navItem.classList.remove('active'));
        const activeNav = Array.from(navItems).find(item => 
            item.querySelector('a').getAttribute('href') === `#${targetId}`);
        if (activeNav) activeNav.classList.add('active');
        
        // Show corresponding panel
        adminPanels.forEach(panel => {
            panel.classList.remove('active');
            if (panel.id === targetId) {
                panel.classList.add('active');
            }
        });
    }
    
    // Set up navigation click handlers
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.querySelector('a').getAttribute('href').substring(1);
            showPanel(targetId);
            // Update URL hash without reloading
            window.history.pushState(null, null, `#${targetId}`);
        });
    });
    
    // Handle initial page load based on URL hash
    const initialHash = window.location.hash.substring(1);
    if (initialHash && document.getElementById(initialHash)) {
        showPanel(initialHash);
    } else {
        showPanel('dashboard'); // Default to dashboard
    }
    
    // Handle browser back/forward navigation
    window.addEventListener('popstate', function() {
        const hash = window.location.hash.substring(1) || 'dashboard';
        showPanel(hash);
    });
    
    /**
     * Update all statistics on the dashboard
     */
    function updateStats() {
        // Show loading state
        if (totalVisitorsElement) totalVisitorsElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        if (totalPageViewsElement) totalPageViewsElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        if (mobileUsersElement) mobileUsersElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        if (pcUsersElement) pcUsersElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

        // Fetch all stats concurrently
        Promise.all([
            fetch(`${API_BASE_URL}/admin/total-visitors`).then(res => res.json()),
            fetch(`${API_BASE_URL}/admin/total-page-views`).then(res => res.json()),
            fetch(`${API_BASE_URL}/admin/mobile-users`).then(res => res.json()),
            fetch(`${API_BASE_URL}/admin/pc-users`).then(res => res.json()),
            fetch(`${API_BASE_URL}/admin/recent-visitors`).then(res => res.json()),
            fetch(`${API_BASE_URL}/admin/browser-stats`).then(res => res.json()),
            fetch(`${API_BASE_URL}/admin/page-stats`).then(res => res.json()),
            fetch(`${API_BASE_URL}/admin/device-stats`).then(res => res.json()),
            fetch(`${API_BASE_URL}/admin/session-buckets`).then(res => res.json())
        ])
            .then(([totalVisitors, totalPageViews, mobileUsers, pcUsers, recentVisitors, browserStats, pageStats, deviceStats, sessionBuckets]) => {
                // Update UI with the data
                updateDashboardWithData(
                    totalVisitors.count,
                    totalPageViews.count,
                    mobileUsers.percentage,
                    pcUsers.percentage,
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
                    visitors.length > 0 ? Math.round((visitors.filter(v => v.device === 'Mobile').length / visitors.length) * 100) : 0,
                    visitors.length > 0 ? Math.round((visitors.filter(v => v.device === 'Desktop').length / visitors.length) * 100) : 0,
                    visitors,
                    computeBrowserStats(visitors),
                    computePageStats(pageViews),
                    computeDeviceStats(visitors),
                    computeSessionBuckets(sessionDurations)
                );
            });
    }
    
    /**
     * Update dashboard with the provided data
     */
    function updateDashboardWithData(totalVisitors, totalPageViews, mobilePercentage, pcPercentage, visitors, browserStats, pageStats, deviceStats, sessionBuckets) {
        // Update summary stats with pulse animation
        if (totalVisitorsElement) {
            totalVisitorsElement.textContent = totalVisitors;
            totalVisitorsElement.closest('.stats-card').classList.add('pulse');
            setTimeout(() => totalVisitorsElement.closest('.stats-card').classList.remove('pulse'), 1000);
        }
        
        if (totalPageViewsElement) {
            totalPageViewsElement.textContent = totalPageViews;
            totalPageViewsElement.closest('.stats-card').classList.add('pulse');
            setTimeout(() => totalPageViewsElement.closest('.stats-card').classList.remove('pulse'), 1000);
        }
        
        if (mobileUsersElement) {
            mobileUsersElement.textContent = `${mobilePercentage}%`;
            mobileUsersElement.closest('.stats-card').classList.add('pulse');
            setTimeout(() => mobileUsersElement.closest('.stats-card').classList.remove('pulse'), 1000);
        }
        
        if (pcUsersElement) {
            pcUsersElement.textContent = `${pcPercentage}%`;
            pcUsersElement.closest('.stats-card').classList.add('pulse');
            setTimeout(() => pcUsersElement.closest('.stats-card').classList.remove('pulse'), 1000);
        }

        // Populate visitors table
        populateVisitorsTable(visitors);
        
        // Update browser and page stats
        updateBrowserStats(browserStats);
        updatePageStats(pageStats);
        
        // Initialize charts
        initCharts(deviceStats, sessionBuckets);
    }
    
    /**
     * Format a date object to a readable string
     */
    function formatDate(date) {
        const options = { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        return date.toLocaleDateString('en-US', options);
    }
    
    /**
     * Initialize all charts
     */
    function initCharts(deviceStats, sessionBuckets) {
        initDeviceChart(deviceStats);
        initSessionChart(sessionBuckets);
    }
    
    /**
     * Initialize device distribution chart
     */
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
                        backgroundColor: ['#9D4EDD', '#C4A1FF', '#5A189A'],
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
    
    /**
     * Initialize session duration chart
     */
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
    
    /**
     * Populate the visitors table with data
     */
    function populateVisitorsTable(visitors) {
        if (!visitorsTableBody) return;
        visitorsTableBody.innerHTML = '';
        
        const sortedVisitors = [...visitors].sort((a, b) => b.timestamp - a.timestamp);
        
        sortedVisitors.forEach(visitor => {
            const row = document.createElement('tr');
            
            const idCell = document.createElement('td');
            idCell.textContent = visitor.id.substring(0, 8) + '...';
            
            const dateCell = document.createElement('td');
            dateCell.textContent = formatDate(new Date(visitor.timestamp));
            
            const visitsCell = document.createElement('td');
            visitsCell.textContent = visitor.visits;
            
            const browserCell = document.createElement('td');
            browserCell.textContent = visitor.browser || 'Unknown';
            
            const deviceCell = document.createElement('td');
            deviceCell.textContent = visitor.device || 'Unknown';
            
            const screenCell = document.createElement('td');
            screenCell.textContent = visitor.screenSize || 'Unknown';
            
            row.appendChild(idCell);
            row.appendChild(dateCell);
            row.appendChild(visitsCell);
            row.appendChild(browserCell);
            row.appendChild(deviceCell);
            row.appendChild(screenCell);
            
            visitorsTableBody.appendChild(row);
        });
    }
    
    /**
     * Update browser distribution stats
     */
    function updateBrowserStats(browserStats) {
        if (!browserStatsElement) return;
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
    
    /**
     * Update page popularity stats
     */
    function updatePageStats(pageStats) {
        if (!pageStatsElement) return;
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
    
    /**
     * Helper functions for localStorage fallback
     */
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
            if (duration.duration < 60) buckets['< 1 min']++;
            else if (duration.duration < 180) buckets['1-3 min']++;
            else if (duration.duration < 300) buckets['3-5 min']++;
            else if (duration.duration < 600) buckets['5-10 min']++;
            else buckets['> 10 min']++;
        });
        return Object.entries(buckets).map(([bucket, count]) => ({ bucket, count }));
    }

    /**
     * Clean up old data
     */
    window.cleanupOldData = function() {
        fetch(`${API_BASE_URL}/admin/cleanup`, { method: 'POST' })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    alert('Old data cleaned up successfully');
                    updateStats();
                } else {
                    alert('Failed to clean up data');
                }
            })
            .catch(error => {
                console.error('Error cleaning up data:', error);
                alert('Error cleaning up data');
            });
    };
});
