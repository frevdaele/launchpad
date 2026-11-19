// Launchpad: your personal settings.
// Edit this file; you don't need to touch app.js.
window.LAUNCHPAD = {
  // Your name in the greeting ("Good morning, Alex").
  name: 'Alex',

  // Language of the texts on the page: 'en' (English) or 'nl' (Dutch).
  language: 'en',

  // Optional: date format, e.g. 'en-GB', 'en-US', 'nl-BE'. Follows the language when left out.
  // locale: 'en-GB',

  // Small labels in front of a link's host name. Add any labels you like;
  // 'hosts' is a list of host names (a * is a wildcard). Use an empty list for no labels.
  // Colours: 'pub' (orange), 'id' (blue), 'vpn' (red).
  labels: [
    { text: 'pub', color: 'pub', title: 'Publicly reachable on the internet', hosts: ['photos.example.com', 'vault.example.com'] },
    { text: 'id',  color: 'id',  title: 'Login via single sign-on',           hosts: ['nas.example.com', 'photos.example.com'] },
    { text: 'vpn', color: 'vpn', title: 'Only reachable over your VPN',       hosts: ['home.example.com', '192.168.1.*'] }
  ]
};
