/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-require-imports */

const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const path = require('path');

/** @type {import('webpack').Configuration} */
module.exports = {
	target: 'node',
	entry: './src/extension.ts',
	output: {
		filename: 'extension.js',
		libraryTarget: 'commonjs2',
		path: path.resolve(process.cwd(), 'dist'),
	},
	devtool: 'source-map',
	externals: {
		vscode: 'commonjs vscode',
	},
	resolve: {
		extensions: ['.ts', '.js', '.json'],
	},
	plugins: [new CleanWebpackPlugin()],
	optimization: {
		minimize: true,
		minimizer: [
			new TerserPlugin({
				extractComments: true,
				terserOptions: {
					output: {
						comments: false,
					},
					mangle: false,
					keep_classnames: true,
					keep_fnames: true,
				},
			}),
		],
	},
	module: {
		rules: [
			{
				test: /\.ts$/,
				use: 'ts-loader',
				exclude: /node_modules/,
			},
		],
	},
};
