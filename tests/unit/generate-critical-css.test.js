/* global browser */

const { generateCriticalCSS, BrowserInterfacePuppeteer } = require( '../../index' );
const { dataUrl } = require( '../lib/data-directory' );
const mockFetch = require( '../lib/mock-fetch' );
const path = require( 'path' );

jest.mock( 'node-fetch' );
require( 'node-fetch' ).mockImplementation( mockFetch );

const testPageUrls = {
	pageA: path.join( dataUrl, 'page-a/index.html' ),
};

let testPages = {};

/**
 * Run a batch of CSS generation test runs, verify the results contain (and do not contain) specific substrings.
 * Verifies no warnings get generated.
 *
 * @param {Object[]} testSets Sets of tests to run, and strings the result should / should not contain.
 */
async function runTestSet( testSets ) {
	for ( const { urls, viewports, shouldContain, shouldNotContain } of testSets ) {
		const [ css, warnings ] = await generateCriticalCSS({
			urls: urls || Object.values( testPageUrls ),
			viewports: viewports || [ { width: 640, height: 480 } ],
			browserInterface: new BrowserInterfacePuppeteer( testPages ),
		});

		expect( warnings ).toHaveLength( 0 );

		for ( const should of shouldContain || [] ) {
			expect( css ).toContain( should );
		}

		for ( const shouldNot of shouldNotContain || [] ) {
			expect( css ).not.toContain( shouldNot );
		}
	}
}

describe( 'Generate Critical CSS', () => {

	// Open test pages in tabs ready for tests.
	beforeAll( async () => {
		for ( const url of Object.values( testPageUrls ) ) {
			testPages[ url ] = await browser.newPage();
			await testPages[ url ].goto( url );
		}
	} );

	// Clean up test pages.
	afterAll( async () => {
		for ( const page of Object.values( testPages ) ) {
			await page.close();
		}
	} );

	describe( 'Inclusions and Exclusions', () => {

		it( 'Excludes elements below the fold', async () => {
			await runTestSet( [
				{
					viewports: [ { width: 640, height: 480 } ],
					shouldContain: [ 'div.top' ],
					shouldNotContain: [ 'div.four_eighty', 'div.six_hundred', 'div.seven_sixty_eight' ],
				},

				{
					viewports: [ { width: 800, height: 600 } ],
					shouldContain: [ 'div.top', 'div.four_eighty' ],
					shouldNotContain: [ 'div.eight_hundred', 'div.seven_sixty_eight' ],
				}
			] );
		} );

		it( 'Excludes irrelevant media queries', async () => {
			await runTestSet( [
				{
					shouldContain: [ '@media screen', '@media all' ],
					shouldNotContain: [ '@media print', '@media not screen' ],
				}
			] );
		} );

	} );

} );