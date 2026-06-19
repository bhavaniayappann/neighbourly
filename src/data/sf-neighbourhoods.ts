import type { FeatureCollection } from "geojson";
import type { NeighbourhoodProperties } from "@/types";

const sfNeighbourhoods: FeatureCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {
        geoid: "06075020800",
        name: "Mission District",
        score: 82,
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-122.422, 37.748],
            [-122.405, 37.748],
            [-122.405, 37.768],
            [-122.422, 37.768],
            [-122.422, 37.748],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: {
        geoid: "06075010102",
        name: "Castro",
        score: 88,
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-122.445, 37.758],
            [-122.432, 37.758],
            [-122.432, 37.772],
            [-122.445, 37.772],
            [-122.445, 37.758],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: {
        geoid: "06075022802",
        name: "Noe Valley",
        score: 91,
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-122.445, 37.738],
            [-122.428, 37.738],
            [-122.428, 37.752],
            [-122.445, 37.752],
            [-122.445, 37.738],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: {
        geoid: "06075020300",
        name: "Haight-Ashbury",
        score: 79,
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-122.455, 37.765],
            [-122.44, 37.765],
            [-122.44, 37.778],
            [-122.455, 37.778],
            [-122.455, 37.765],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: {
        geoid: "06075002601",
        name: "SOMA",
        score: 75,
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-122.41, 37.772],
            [-122.39, 37.772],
            [-122.39, 37.79],
            [-122.41, 37.79],
            [-122.41, 37.772],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: {
        geoid: "06075040100",
        name: "North Beach",
        score: 86,
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-122.415, 37.798],
            [-122.402, 37.798],
            [-122.402, 37.808],
            [-122.415, 37.808],
            [-122.415, 37.798],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: {
        geoid: "06075011901",
        name: "Pacific Heights",
        score: 93,
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-122.45, 37.785],
            [-122.43, 37.785],
            [-122.43, 37.798],
            [-122.45, 37.798],
            [-122.45, 37.785],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: {
        geoid: "06075015301",
        name: "Richmond",
        score: 84,
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-122.495, 37.775],
            [-122.455, 37.775],
            [-122.455, 37.79],
            [-122.495, 37.79],
            [-122.495, 37.775],
          ],
        ],
      },
    },
  ],
};

export type SfNeighbourhoodFeature = (typeof sfNeighbourhoods.features)[number] & {
  properties: NeighbourhoodProperties;
};

export default sfNeighbourhoods;
