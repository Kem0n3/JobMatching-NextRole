// public/js/main.js
document.addEventListener('DOMContentLoaded', function() {
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const appShell = document.querySelector('.app-shell'); 

    if (mobileMenuToggle && appShell) {
        mobileMenuToggle.addEventListener('click', function(event) {
            event.stopPropagation(); // Prevent click from bubbling to document
            appShell.classList.toggle('sidebar-open');
        });
    }

 
    const sidebar = document.querySelector('.sidebar-area');
    document.addEventListener('click', function(event) {
        if (appShell && sidebar && appShell.classList.contains('sidebar-open')) {
            const isClickInsideSidebar = sidebar.contains(event.target);
            const isClickOnToggle = mobileMenuToggle ? mobileMenuToggle.contains(event.target) : false;

            if (!isClickInsideSidebar && !isClickOnToggle) {
                appShell.classList.remove('sidebar-open');
            }
        }
    });
});