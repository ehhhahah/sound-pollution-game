// Function to load HTML components
async function loadComponent(elementId, componentPath) {
  try {
    const response = await fetch(componentPath)
    const html = await response.text()
    document.getElementById(elementId).innerHTML = html
  } catch (error) {
    console.error(`Error loading component ${componentPath}:`, error)
  }
}

// Function to load head content
async function loadHeadContent() {
  try {
    const response = await fetch('components/head.html')
    const html = await response.text()
    const head = document.head
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')

    // Remove existing meta tags and title
    const existingMeta = head.querySelectorAll('meta')
    const existingTitle = head.querySelector('title')
    const existingLink = head.querySelector('link[rel="stylesheet"]')

    existingMeta.forEach((meta) => meta.remove())
    if (existingTitle) existingTitle.remove()
    if (existingLink) existingLink.remove()

    // Add new head content
    Array.from(doc.head.children).forEach((element) => {
      head.appendChild(element)
    })
  } catch (error) {
    console.error('Error loading head component:', error)
  }
}

// Load head content immediately
loadHeadContent()

// Load other components when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  loadComponent('navbar-container', 'components/navbar.html')
  loadComponent('footer-container', 'components/footer.html')
})
