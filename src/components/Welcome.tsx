import { useMediaQuery } from '../scripts/useMediaQuery';

export default function Welcome() {
    const mobile = useMediaQuery('(max-width: 1200px)');

    return (
        <div>
            <div style={{ textAlign: 'left' }}>Search for albums here ⇡</div>
            <div style={{ padding: '2em 1em 1em' }}>
                <h3 style={{ margin: 0 , color: 'red' }}>Welcome to Topsters 2.099</h3>
                <h5>This site is a replica of the original Topsters site (never-ending-chart-rendering) that is now defunct. I missed the format and most remakes of the site don't have the same look to the albums collages. Hope you enjoy this substitute!</h5>
                <h4>Instructions:</h4>
                <ol>
                    <li>Search for your favorite albums and artists.</li>
                    <li>
                        {mobile
                            ? 'Tap an album cover to add it to the next empty slot on the chart.'
                            : 'Drag album covers onto the chart.'}
                    </li>
                    <li>
                        {mobile
                            ? 'At the end of every search result, there is a transparent tile. Tap it to remove the last album from your chart.'
                            : 'At the end of every search result, there is a transparent tile to drag over and remove albums.'}
                    </li>
                    <li>{mobile ? 'Tap "Show Options" to customize your collage.' : 'Click "Show Options" to customize your collage.'}</li>
                    <li>Download your collage in your desired format using the buttons in the top right corner.</li>
                </ol>
                <p>
                    <b>Charts are saved automatically in local storage. </b> 
                    Clearing your browser data may result in your chart(s) being lost. Back up your charts just in case!
                </p>
                <p>
                    <b>If you can&apos;t find an album (eg. King Crimson),</b> lastfm may not have it.{' '}
                    {mobile
                        ? 'On a computer, you can drag and drop images from Google Images or another source onto the chart and name them in the album title list manually.'
                        : 'You can drag and drop images from Google Images or another source and name it in the album title list manually.'}
                </p>
                <p>If you have any feedback or requested features, email me at <u>boundbybattlefeedback@gmail.com</u></p>

                <p>
                    Data courtesy of{' '}
                    <a href="https://www.last.fm" target="_blank" rel="noopener noreferrer">last.fm</a> API. This website is not affiliated with lastfm. 
                </p>
            </div>
        </div>
    );
}
