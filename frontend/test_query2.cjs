const query = `
      query ($userId: Int) {
        Page(page: 1, perPage: 100) {
          mediaList(userId: $userId, type: ANIME) {
            id
            status
            progress
            score(format: POINT_10)
            media {
              id
              title {
                userPreferred
              }
              coverImage {
                large
              }
              format
              episodes
              duration
              status
              startDate {
                year
                month
                day
              }
              relations {
                edges {
                  relationType
                  node {
                    id
                    title {
                      userPreferred
                    }
                    coverImage {
                      large
                    }
                    format
                    episodes
                    status
                  }
                }
              }
            }
          }
        }
      }
    `;
fetch('https://graphql.anilist.co', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ query, variables: { userId: 7952169 } })
}).then(r => r.json()).then(d => {
  if (d.errors) { console.error("ERRORS:", d.errors); }
  else { console.log("SUCCESS, found items:", d.data.Page.mediaList.length); }
}).catch(console.error);
