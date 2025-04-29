document.addEventListener('DOMContentLoaded', function() {
    const routesContainer = document.getElementById('routes-container');

    // Function to fetch routes
    async function fetchRoutes() {
        try {
            const response = await fetch('http://localhost:5000/api/routes'); // Update with actual API endpoint
            if (!response.ok) throw new Error('Failed to fetch routes');

            const routes = await response.json();
            displayRoutes(routes);
        } catch (error) {
            console.error('Error fetching routes:', error);
            routesContainer.innerHTML = '<p>Failed to load routes. Please try again later.</p>';
        }
    }

    // Function to display routes
    function displayRoutes(routes) {
        if (routes.length === 0) {
            routesContainer.innerHTML = '<p>No routes available.</p>';
            return;
        }

        const routesList = document.createElement('ul');
        routes.forEach(route => {
            const routeItem = document.createElement('li');
            routeItem.textContent = `Route: ${route.name} - Duration: ${route.duration} mins`;
            routesList.appendChild(routeItem);
        });

        routesContainer.appendChild(routesList);
    }

    // Fetch and display routes on page load
    fetchRoutes();
}); 