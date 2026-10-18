export default function Welcome() {
    return (
        <div>
            <div style={{ textAlign: 'left' }}>Search for albums here ⇡</div>
            <div style={{ padding: '2em 1em 1em' }}>
                <h3 style={{ margin: 0 , color: 'red' }}>Welcome to Topsters 2.099</h3>
                <h5>This site is a replica of the original Topsters site (never-ending-chart-rendering) that is now defunct. I missed the format and most remakes of the site don't have the same look to the albums collages. Hope you enjoy this substitute!</h5>
                <h4>Instructions:</h4>
                <ol>
                    <li>Search for your favorite albums and artists.</li>
                    <li>Drag album covers onto the chart.</li>
                    <li>At the end of every search result, there is a checkered square to drag over and remove albums.</li>
                    <li>Click "Show Options" to customize your collage.</li>
                    <li>Download your collage in your desired format using the buttons in the top right corner.</li>
                </ol>
                <p>
                    <b>Charts are saved automatically in local storage. </b> 
                    Clearing your browser data may result in your chart(s) being lost. Back up your charts just in case!
                </p>
                <p>
                    <b>If you  can&apos;t find an album (eg. King Crimson),</b> lastfm may not have it. You can drag and drop images from Google Images or another source and name it in the album title list manually.
                </p>
                <p>If you have any feedback or requested features, email me at <u>boundbybattlefeedback@gmail.com</u></p>

                <p>
                    Data courtesy of <u>last.fm</u> API. This website is not affiliated with lastfm. 
                </p>
            </div>
        </div>
    );
}
