// Exact geographic matching: Chinatown, Vancouver is not Chinatown, Victoria.
const nonAreas = new Set(['Multiple locations', 'Mobile food truck']);
export function locationLines(label) {
  const parts = label.split(' · ').map(x => x.trim()).filter(Boolean);
  const city = parts.length > 1 ? parts.at(-1) : '';
  return parts.map((line, index) => line.split(' / ').map(name => {
    if (nonAreas.has(name)) return {name};
    if (parts.length === 1 && ['South Vancouver', 'East Vancouver'].includes(name))
      return {name, scope: {type:'area', name, city:'Vancouver'}};
    return {name, scope: {type: city && index === 0 ? 'area' : 'city', name, ...(city && index === 0 ? {city} : {})}};
  }));
}
export function matchesLocation(label, scope) {
  if (!scope) return true;
  const locations = locationLines(label).flat().filter(x => x.scope).map(x => x.scope);
  return locations.some(x => scope.type === 'city'
    ? (x.type === 'city' && x.name === scope.name) || (x.type === 'area' && x.city.split(' / ').includes(scope.name))
    : x.type === 'area' && x.name === scope.name && x.city === scope.city);
}

// Classify destination cities, never neighbourhood text (Granville Island is Vancouver).
// Multi-region businesses intentionally match both; branch choice remains unspecified.
const islandCities = new Set(['Vancouver Island','Victoria','Saanich','Sidney','Sooke','Nanaimo','Parksville','Qualicum Beach','Port Alberni','Courtenay','Comox','Campbell River','Duncan','Tofino','Ucluelet','Salt Spring Island','Galiano Island','Pender Island','Mayne Island','Saturna Island','Bowen Island']);
export function matchesRegion(label, region) {
  if (!region || region === 'all') return true;
  const cities = label.split(' · ').at(-1).split(' / ').map(x => x.trim()).filter(Boolean);
  return cities.some(city => region === 'islands' ? islandCities.has(city) : !islandCities.has(city));
}
