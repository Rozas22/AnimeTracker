const query = `
      query ($name: String) {
        User (name: $name) {
          id
          name
          avatar { large }
          siteUrl
          about
          statistics {
            anime { count minutesWatched episodesWatched }
            manga { count chaptersRead }
          }
        }
      }
    `;
fetch('https://graphql.anilist.co', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ query, variables: { name: 'Rozas22' } })
}).then(r => r.json()).then(d => console.log(JSON.stringify(d, null, 2))).catch(console.error);
