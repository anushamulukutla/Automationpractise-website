'use strict';

// Country -> state -> cities, used by the dependent dropdowns (loaded via API).
const GEO = {
  US: {
    name: 'United States',
    states: {
      CA: { name: 'California', cities: ['Los Angeles', 'San Francisco', 'San Diego'] },
      TX: { name: 'Texas', cities: ['Houston', 'Austin', 'Dallas'] },
      FL: { name: 'Florida', cities: ['Miami', 'Tampa', 'Orlando'] },
    },
  },
  CA: {
    name: 'Canada',
    states: {
      ON: { name: 'Ontario', cities: ['Toronto', 'Mississauga', 'Ottawa'] },
      QC: { name: 'Quebec', cities: ['Montreal', 'Quebec City'] },
      BC: { name: 'British Columbia', cities: ['Vancouver', 'Victoria'] },
    },
  },
  IN: {
    name: 'India',
    states: {
      KA: { name: 'Karnataka', cities: ['Bengaluru', 'Mysuru'] },
      MH: { name: 'Maharashtra', cities: ['Mumbai', 'Pune'] },
      TS: { name: 'Telangana', cities: ['Hyderabad', 'Warangal'] },
    },
  },
  GB: {
    name: 'United Kingdom',
    states: {
      ENG: { name: 'England', cities: ['London', 'Manchester'] },
      SCT: { name: 'Scotland', cities: ['Edinburgh', 'Glasgow'] },
    },
  },
  AU: {
    name: 'Australia',
    states: {
      NSW: { name: 'New South Wales', cities: ['Sydney', 'Newcastle'] },
      VIC: { name: 'Victoria', cities: ['Melbourne', 'Geelong'] },
    },
  },
};

// Names used by the autocomplete / typeahead endpoint.
const AUTOCOMPLETE_NAMES = [
  'Argentina', 'Australia', 'Austria', 'Bangladesh', 'Belgium', 'Brazil', 'Canada', 'Chile', 'China',
  'Colombia', 'Czechia', 'Denmark', 'Egypt', 'Finland', 'France', 'Germany', 'Ghana', 'Greece',
  'Hungary', 'Iceland', 'India', 'Indonesia', 'Ireland', 'Israel', 'Italy', 'Japan', 'Kenya',
  'Malaysia', 'Mexico', 'Morocco', 'Nepal', 'Netherlands', 'New Zealand', 'Nigeria', 'Norway',
  'Pakistan', 'Peru', 'Philippines', 'Poland', 'Portugal', 'Romania', 'Singapore', 'South Africa',
  'South Korea', 'Spain', 'Sri Lanka', 'Sweden', 'Switzerland', 'Thailand', 'Turkey',
  'United Arab Emirates', 'United Kingdom', 'United States', 'Vietnam',
];

module.exports = { GEO, AUTOCOMPLETE_NAMES };
