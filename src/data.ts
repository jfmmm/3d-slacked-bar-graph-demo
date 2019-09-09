import _ from "lodash";

const u = [1, 5, 10, 15, 20, 25];
const n = [1, 10, 20, 30, 40, 50];

const data = {};

_.each(u, (u, x) => {
  data[u] = {};

  _.each(n, (n, z) => {
    data[u][n] = {
      checkout: 700 * ((x * z) / 2),
      commit: 300 * ((x * z) / 2),
      branch: 1000 * ((x * z) / 2),
      destruction: 100 * ((x * z) / 2),
      disconnect: 100 * ((x * z) / 2)
    };
  });
});

_.times(u, (i: number) => {
  data[i] = {};
});
console.log(data);

export default data;

export const colors = {
  checkout: 0xef0000,
  commit: 0x336699,
  branch: 0xfec211,
  destruction: 0x3bc371,
  disconnect: 0x666699
};
