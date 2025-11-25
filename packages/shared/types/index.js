// Shared TypeScript/JavaScript types and interfaces
// Used by both frontend and backend

module.exports = {
  PropertyType: {
    APARTMENT: 'mieszkanie',
    HOUSE: 'dom',
    PLOT: 'działka',
    COMMERCIAL: 'komercyjne'
  },

  TransactionType: {
    SALE: 'sprzedaż',
    RENT: 'wynajem'
  },

  PropertySource: {
    OLX: 'olx',
    OTODOM: 'otodom'
  },

  SubscriptionPlan: {
    BASIC: 'basic',
    PREMIUM: 'premium',
    PRO: 'pro'
  },

  NotificationType: {
    NEW_PROPERTY: 'new_property',
    PRICE_CHANGE: 'price_change',
    ALERT_MATCH: 'alert_match'
  }
};
