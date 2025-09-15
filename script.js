document.addEventListener('DOMContentLoaded', () => {
    const feedLinks = document.querySelectorAll('.feed-item');
    const contentBlocks = document.querySelectorAll('.feed-content');

    // Check if we found the elements
    if (feedLinks.length === 0) {
        console.error("No feed links found. Check your HTML class names.");
        return;
    }

    feedLinks.forEach(link => {
        link.addEventListener('click', (event) => {
            event.preventDefault(); // Stop the link from trying to go anywhere

            const targetId = link.getAttribute('data-target');
            const targetElement = document.getElementById(targetId);

            // Deactivate all links and content
            feedLinks.forEach(item => item.classList.remove('active-feed'));
            contentBlocks.forEach(block => block.classList.remove('active'));

            // Activate the clicked link and its corresponding content
            link.classList.add('active-feed');
            if (targetElement) {
                targetElement.classList.add('active');
            } else {
                console.error(`Content block with ID '${targetId}' not found.`);
            }
        });
    });
});
