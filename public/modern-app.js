// Variables globales
let currentGames = [];
let app = null;

// Fonction pour afficher/masquer le spinner de chargement
function showLoading(show = true) {
  const loadingSpinner = document.getElementById('loading-spinner');
  const gamesGrid = document.getElementById('games-grid');
  const noResults = document.getElementById('no-results');
  
  if (show) {
    loadingSpinner.style.display = 'flex';
    gamesGrid.style.display = 'none';
    noResults.style.display = 'none';
  } else {
    loadingSpinner.style.display = 'none';
    gamesGrid.style.display = 'grid';
  }
}

// Fonction pour animer les chiffres
function animateNumber(element, endValue, duration = 1000) {
  const startValue = parseInt(element.textContent) || 0;
  const increment = (endValue - startValue) / (duration / 16); // 60fps
  let currentValue = startValue;
  
  const timer = setInterval(() => {
    currentValue += increment;
    if ((increment > 0 && currentValue >= endValue) || (increment < 0 && currentValue <= endValue)) {
      element.textContent = endValue;
      clearInterval(timer);
    } else {
      element.textContent = Math.floor(currentValue);
    }
  }, 16);
}

// Fonction pour mettre à jour les statistiques - avec animation
function updateStats(games) {
  // Filtrer pour ne garder que les jeux en promotion (discount > 0%)
  const promoGames = games.filter(game => {
    const discount = parseInt(game.discountPercent || game.discount || 0);
    return discount > 0 && discount < 100;
  });
  
  const freeGames = games.filter(game => {
    const discount = parseInt(game.discountPercent || game.discount || 0);
    return discount === 100;
  });
  
  
  // Animer les chiffres
  animateNumber(document.getElementById('freeGames'), freeGames.length);
  animateNumber(document.getElementById('promoGames'), promoGames.length);
}

// Fonction pour obtenir les plateformes sélectionnées - corrigée
function getSelectedPlatforms() {
  const platforms = [];
  document.querySelectorAll('.platform-toggle.active').forEach(toggle => {
    platforms.push(toggle.dataset.platform);
  });
  console.log('🔍 Plateformes sélectionnées:', platforms);
  return platforms.length > 0 ? platforms : ['epic', 'steam', 'gog'];
}

// Fonction pour obtenir la réduction sélectionnée
function getSelectedDiscount() {
  const discountRange = document.getElementById('discount-range');
  return discountRange ? parseInt(discountRange.value) : 0;
}

// Fonction pour charger les jeux
async function loadGames() {
  try {
    showLoading(true);
    
    const platforms = getSelectedPlatforms();
    const discount = getSelectedDiscount();
    
    console.log('🔄 Chargement des jeux avec filtres:', { platforms, discount });
    
    const response = await fetch(`/api/free-games?platforms=${platforms.join(',')}&discount=${discount}`);
    
    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('📦 Données reçues:', data.length, 'jeux');
    
    currentGames = data;
    
    // Mettre à jour les statistiques
    updateStats(data);
    
    // Afficher les jeux
    displayGames(data);
    
  } catch (error) {
    console.error('❌ Erreur lors du chargement:', error);
    showError('Erreur lors du chargement des jeux');
  } finally {
    showLoading(false);
  }
}

// Fonction pour afficher les jeux - avec filtrage par plateforme corrigé
function displayGames(games) {
  const gamesGrid = document.getElementById('games-grid');
  const noResults = document.getElementById('no-results');
  
  // Filtrer pour ne montrer que les jeux en promotion (discount > 0%)
  let filteredGames = games.filter(game => {
    const discount = parseInt(game.discountPercent || game.discount || 0);
    return discount > 0;
  });
  
  // Appliquer le filtre de plateforme
  const selectedPlatforms = getSelectedPlatforms();
  filteredGames = filteredGames.filter(game => {
    const gamePlatform = game.platform || 'unknown';
    const isIncluded = selectedPlatforms.includes(gamePlatform);
    if (!isIncluded) {
      console.log(`❌ Jeu "${game.game || game.title}" (${gamePlatform}) exclu - plateformes: [${selectedPlatforms.join(',')}]`);
    }
    return isIncluded;
  });
  
  // Appliquer le filtre de réduction minimale
  const minDiscount = getSelectedDiscount();
  if (minDiscount > 0) {
    filteredGames = filteredGames.filter(game => {
      const discount = parseInt(game.discountPercent || game.discount || 0);
      return discount >= minDiscount;
    });
  }
  
  // Appliquer le tri
  const sortBy = document.getElementById('sort-select')?.value || 'discount-desc';
  filteredGames = sortGames(filteredGames, sortBy);
  
  console.log(`📊 Jeux filtrés: ${filteredGames.length}/${games.length} (plateformes: ${selectedPlatforms.join(',')}, réduction ≥${minDiscount}%)`);
  
  if (filteredGames.length === 0) {
    gamesGrid.style.display = 'none';
    noResults.style.display = 'flex';
    return;
  }
  
  noResults.style.display = 'none';
  gamesGrid.style.display = 'grid';
  
  gamesGrid.innerHTML = filteredGames.map(game => createGameCard(game)).join('');
  
  // Mettre à jour le titre des résultats
  updateResultsTitle(filteredGames.length);
}

// Fonction pour trier les jeux
function sortGames(games, sortBy) {
  return games.sort((a, b) => {
    const aDiscount = parseInt(a.discountPercent || a.discount || 0);
    const bDiscount = parseInt(b.discountPercent || b.discount || 0);
    const aPrice = parseFloat(a.discountPrice || a.currentPrice || a.price || 0);
    const bPrice = parseFloat(b.discountPrice || b.currentPrice || b.price || 0);
    const aOriginalPrice = parseFloat(a.originalPrice || a.regularPrice || 0);
    const bOriginalPrice = parseFloat(b.originalPrice || b.regularPrice || 0);
    const aName = (a.game || a.title || '').toLowerCase();
    const bName = (b.game || b.title || '').toLowerCase();
    
    switch (sortBy) {
      case 'discount-desc': 
        return bDiscount - aDiscount; // Plus grosse réduction d'abord
      case 'discount-asc': 
        return aDiscount - bDiscount; // Plus petite réduction d'abord
      case 'price-desc': 
        return bPrice - aPrice; // Prix le plus cher d'abord
      case 'price-asc': 
        return aPrice - bPrice; // Prix le moins cher d'abord
      case 'name-asc': 
        return aName.localeCompare(bName); // A-Z
      case 'name-desc': 
        return bName.localeCompare(aName); // Z-A
      case 'platform': 
        return a.platform.localeCompare(b.platform); // Par plateforme
      case 'year-desc': 
        return (b.releaseYear || 0) - (a.releaseYear || 0); // Plus récent d'abord
      case 'year-asc': 
        return (a.releaseYear || 0) - (b.releaseYear || 0); // Plus ancien d'abord
      default: 
        return bDiscount - aDiscount; // Par défaut: réduction décroissante
    }
  });
}

// Fonction pour obtenir les initiales d'un jeu
function getGameInitials(title) {
  return title.split(' ')
    .map(word => word[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
}

// Fonction pour créer un placeholder SVG
function createPlaceholderSVG(title) {
  const initials = title.split(' ').map(word => word[0]).join('').substring(0, 2).toUpperCase();
  const colors = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe'];
  const color = colors[title.length % colors.length];
  
  return `data:image/svg+xml,${encodeURIComponent(`
    <svg width="300" height="400" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${color};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${color}AA;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#grad)"/>
      <text x="50%" y="45%" dominant-baseline="middle" text-anchor="middle" font-family="Arial, sans-serif" font-size="48" font-weight="bold" fill="white">${initials}</text>
      <text x="50%" y="65%" dominant-baseline="middle" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" fill="white">🎮</text>
    </svg>
  `)}`;
}

// Fonction pour formater le prix
function formatPrice(price) {
  if (!price || price === 0) return 'Gratuit';
  
  // Convertir en nombre et nettoyer
  let numPrice = typeof price === 'string' ? parseFloat(price.replace(/[^0-9.]/g, '')) : price;
  
  // Gérer les prix en centimes (Steam API renvoie parfois en centimes)
  if (numPrice > 1000) {
    numPrice = numPrice / 100;
  }
  
  // Détecter la devise
  if (price.toString().includes('$')) {
    return `${numPrice.toFixed(2)}$`;
  } else {
    return `${numPrice.toFixed(2)}€`;
  }
}

// Fonction pour obtenir l'icône de la plateforme
function getPlatformIcon(platform) {
  const icons = {
    'epic': '<i class="fas fa-shopping-cart"></i> Epic',
    'steam': '<i class="fab fa-steam"></i> Steam',
    'gog': '<i class="fas fa-compact-disc"></i> GOG'
  };
  return icons[platform] || platform;
}

// Fonction pour modifier le titre de la page dans updateResultsTitle
function updateResultsTitle(count) {
  const title = document.getElementById('results-title');
  if (title) {
    title.textContent = `${count} promotion${count > 1 ? 's' : ''} trouvée${count > 1 ? 's' : ''}`;
  }
}

// Fonction pour afficher une erreur
function showError(message) {
  const gamesGrid = document.getElementById('games-grid');
  gamesGrid.innerHTML = `
    <div class="error-message">
      <i class="fas fa-exclamation-triangle"></i>
      <h3>Erreur</h3>
      <p>${message}</p>
      <button onclick="loadGames()" class="retry-btn">
        <i class="fas fa-redo"></i> Réessayer
      </button>
    </div>
  `;
}

// Fonction pour ouvrir le modal d'un jeu
function openGameModal(gameId) {
  console.log('Ouverture du modal pour:', gameId);
  // TODO: Implémenter l'affichage détaillé du jeu
}

// Fonction pour créer une carte de jeu - simplifiée
function createGameCard(game) {
  // Vérifier et nettoyer les données du jeu selon l'API
  const title = game.game || game.title || game.name || 'Jeu sans nom';
  const platform = game.platform || 'unknown';
  const discount = parseInt(game.discountPercent || game.discount || 0);
  const currentPrice = parseFloat(game.discountPrice || game.currentPrice || game.price || 0);
  const originalPrice = parseFloat(game.originalPrice || game.regularPrice || 0);
  const gameUrl = game.url || game.link || '#';
  const gameImage = game.image || game.imageUrl || game.thumbnail || createPlaceholderSVG(title);
  
  // Ne pas afficher si pas de promotion
  if (discount <= 0) {
    return '';
  }
  
  console.log('Création carte promotion:', { title, platform, discount, currentPrice, originalPrice });
  
  // Badge de réduction - une seule fois
  const discountBadge = `<div class="discount-badge ${discount === 100 ? 'free' : 'promo'}">${discount === 100 ? 'GRATUIT' : `-${discount}%`}</div>`;
  
  // Affichage du prix simplifié
  let priceDisplay;
  if (discount === 100) {
    priceDisplay = '<span class="price free">Gratuit</span>';
  } else if (originalPrice > 0 && currentPrice >= 0) {
    const savings = originalPrice - currentPrice;
    priceDisplay = `<div class="price-container">
      <span class="original-price">${formatPrice(originalPrice)}</span>
      <span class="current-price">${formatPrice(currentPrice)}</span>
      <span class="savings">Économie: ${formatPrice(savings)}</span>
    </div>`;
  } else {
    priceDisplay = `<span class="current-price">${formatPrice(currentPrice)}</span>`;
  }
  
  const platformIcon = getPlatformIcon(platform);
  
  return `
    <div class="game-card" onclick="openGameModal('${encodeURIComponent(title)}')">
      ${discountBadge}
      <div class="game-image">
        <img src="${gameImage}" alt="${title}" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
        <div class="image-fallback" style="display:none;">
          <div class="fallback-content">
            <div class="game-initials">${getGameInitials(title)}</div>
            <div class="fallback-icon">🎮</div>
          </div>
        </div>
        <div class="platform-badge">${platformIcon}</div>
      </div>
      <div class="game-info">
        <h3 class="game-title">${title}</h3>
        <div class="game-meta">
          ${game.releaseYear ? `<span class="release-year">${game.releaseYear}</span>` : ''}
          ${game.genre ? `<span class="genre">${game.genre}</span>` : ''}
        </div>
        <div class="game-price">
          ${priceDisplay}
        </div>
        <div class="game-actions">
          <button class="btn-primary" onclick="event.stopPropagation(); window.open('${gameUrl}', '_blank')">
            <i class="fas fa-external-link-alt"></i> 
            ${discount === 100 ? 'Récupérer' : 'Voir l\'offre'}
          </button>
        </div>
      </div>
    </div>
  `;
}

// Fonctions globales
window.refreshData = function() {
  console.log('🔄 Actualisation des données...');
  loadGames();
};

window.closeModal = function() {
  const modal = document.getElementById('game-modal');
  if (modal) {
    modal.style.display = 'none';
  }
};

window.showAbout = function() {
  alert('Free Games API - Découvrez les meilleures offres gaming en temps réel !');
};

window.showHelp = function() {
  alert('Utilisez les filtres pour trouver vos jeux préférés. Cliquez sur un jeu pour plus de détails.');
};

window.clearSearch = function() {
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.value = '';
    filterGames(); // Changé: filterGames au lieu de loadGames
  }
};

window.resetFilters = function() {
  // Réinitialiser tous les filtres
  document.querySelectorAll('.platform-toggle').forEach(toggle => {
    toggle.classList.add('active');
    toggle.querySelector('input').checked = true;
  });
  
  const discountRange = document.getElementById('discount-range');
  if (discountRange) {
    discountRange.value = 0;
    document.getElementById('discount-value').textContent = '0%';
  }
  
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.value = '';
  }
  
  const yearFilter = document.getElementById('year-filter');
  if (yearFilter) {
    yearFilter.value = '';
  }
  
  const sortSelect = document.getElementById('sort-select');
  if (sortSelect) {
    sortSelect.value = 'discount-desc';
  }
  
  // Mettre à jour les boutons de preset
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.discount === '0') {
      btn.classList.add('active');
    }
  });
  
  // Recharger les données
  loadGames();
};

// Initialisation au chargement de la page
document.addEventListener('DOMContentLoaded', function() {
  console.log('🚀 Application initialisée');
  
  // Charger les jeux immédiatement
  loadGames();
  
  // Initialiser les event listeners pour les filtres
  initializeFilters();
});

// Fonction pour initialiser les filtres - corrigée
function initializeFilters() {
  // Slider de réduction
  const discountRange = document.getElementById('discount-range');
  if (discountRange) {
    discountRange.addEventListener('input', function() {
      document.getElementById('discount-value').textContent = this.value + '%';
    });
    
    discountRange.addEventListener('change', filterGames);
  }
  
  // Toggles de plateforme - logique corrigée
  document.querySelectorAll('.platform-toggle').forEach(toggle => {
    console.log('🔧 Initialisation bouton plateforme:', toggle.dataset.platform);
    
    toggle.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      
      console.log(`🖱️ Clic sur plateforme ${this.dataset.platform}`);
      
      // Toggle de l'état actif
      this.classList.toggle('active');
      
      // Mettre à jour la checkbox
      const checkbox = this.querySelector('input[type="checkbox"]');
      if (checkbox) {
        checkbox.checked = this.classList.contains('active');
      }
      
      // Vérifier qu'au moins une plateforme reste sélectionnée
      const activePlatforms = document.querySelectorAll('.platform-toggle.active');
      if (activePlatforms.length === 0) {
        // Forcer à garder cette plateforme active
        this.classList.add('active');
        if (checkbox) checkbox.checked = true;
        console.log('⚠️ Au moins une plateforme doit rester sélectionnée');
        return;
      }
      
      const isActive = this.classList.contains('active');
      console.log(`📱 Plateforme ${this.dataset.platform}: ${isActive ? 'ACTIVÉE' : 'DÉSACTIVÉE'}`);
      
      // Appliquer le filtrage immédiatement
      setTimeout(() => {
        filterGames();
      }, 50);
    });
  });
  
  // Boutons de preset de réduction
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      
      const discount = parseInt(this.dataset.discount);
      if (discountRange) {
        discountRange.value = discount;
        document.getElementById('discount-value').textContent = discount + '%';
      }
      
      filterGames();
    });
  });
  
  // Recherche
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    let searchTimeout;
    searchInput.addEventListener('input', function() {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        applySearchFilter();
      }, 500);
    });
  }
  
  // Filtres de tri et année
  const yearFilter = document.getElementById('year-filter');
  const sortSelect = document.getElementById('sort-select');
  
  if (yearFilter) {
    yearFilter.addEventListener('change', filterGames);
  }
  
  if (sortSelect) {
    sortSelect.addEventListener('change', filterGames);
  }
  
  console.log('✅ Filtres initialisés');
}

// Fonction pour appliquer le filtre de recherche
function applySearchFilter() {
  const searchTerm = document.getElementById('search-input')?.value.toLowerCase();
  
  if (!searchTerm) {
    filterGames();
    return;
  }
  
  let searchResults = currentGames.filter(game => {
    const title = (game.game || game.title || '').toLowerCase();
    return title.includes(searchTerm);
  });
  
  console.log(`🔍 Recherche: "${searchTerm}" - ${searchResults.length} résultats`);
  displayGames(searchResults);
}

// Fonction pour filtrer côté client (plus rapide)
function filterGames() {
  if (currentGames.length === 0) {
    loadGames();
    return;
  }
  
  console.log('🔄 Filtrage côté client...');
  displayGames(currentGames);
}
