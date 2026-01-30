
// Optimized Simplified China GeoJSON
// Based on standard boundaries (approximate for lightweight rendering)
// This ensures the map looks like China and aligns with city coordinates.

export const chinaGeoJson = {
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "name": "China Mainland",
        "adcode": "100000"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          // Northeast (Heilongjiang)
          [135.08, 48.25], [130.63, 42.66], [129.98, 42.92], [128.16, 42.06], 
          [124.31, 40.16], [121.67, 40.91], [119.55, 39.77], [118.06, 39.06],
          // Bohai Sea / Shandong
          [119.24, 37.88], [122.51, 37.45], [122.08, 36.87], [119.34, 35.03],
          // East Coast (Jiangsu, Shanghai, Zhejiang, Fujian)
          [121.75, 31.78], [121.94, 30.87], [120.67, 27.97], [119.78, 25.43],
          // South Coast (Guangdong)
          [116.89, 23.44], [114.12, 22.56], [113.56, 22.17], [109.68, 21.49],
          // Southwest (Guangxi, Yunnan)
          [108.06, 21.60], [106.63, 22.79], [104.97, 23.23], [101.44, 21.28],
          [99.41, 23.36], [97.59, 24.32], [98.54, 28.15],
          // West (Tibet)
          [97.02, 28.32], [95.53, 29.56], [91.75, 27.87], [88.58, 27.78],
          [85.16, 28.27], [81.93, 30.34], [78.73, 33.68], 
          // Northwest (Xinjiang)
          [76.35, 36.85], [75.05, 39.30], [73.54, 39.46], [74.37, 41.59],
          [80.50, 44.88], [82.59, 45.47], [85.99, 47.78], [87.56, 49.16],
          [90.49, 47.90], [95.84, 42.86], 
          // North (Inner Mongolia)
          [100.28, 42.02], [106.96, 41.87], [110.87, 43.43], [114.77, 44.75],
          [116.59, 46.99], [120.08, 50.29], [123.51, 53.56], [135.08, 48.25]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": { "name": "Hainan" },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [110.53, 20.07], [111.05, 19.62], [110.58, 18.52], [109.13, 18.30], 
          [108.64, 19.26], [110.53, 20.07]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": { "name": "Taiwan" },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [121.91, 25.09], [122.00, 24.63], [120.89, 21.91], [120.06, 23.00], 
          [120.09, 24.08], [121.91, 25.09]
        ]]
      }
    }
  ]
};
