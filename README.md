# Chef’s Favourite — British Columbia

A sourced starting list of **British Columbia destinations recommended by chefs and cooks** in Chef’s Favourite’s **Mates on Crates** series, excluding their own restaurants, current workplaces and known affiliated venues.

## Read the list

**[Open the chef directory](https://chefs-fav.vercel.app/)** — a chef/restaurant-owner directory in a newest-first list (no map). Crate episode photos introduce each person and their restaurant; selecting a profile reveals that person’s outside recommendations and timestamped comments. All-picks browsing is secondary, with no popularity ranking or endorsement tally. Saved favourites stay on your device. Mobile uses a scrolling profile list and individual recommendation cards.

The directory has 64 profiles; dates are labelled as episode write-up dates. There are 585 place entries, with addresses available for 200 OpenStreetMap matches. Multiple-chain locations may be unspecified by the original chef; the location note makes this explicit.

- **[Chef-by-chef recommendations](CHEFS.md)** — 785 category/answer entries from 64 episode write-ups.
- [Spreadsheet CSV](data/recommendations.csv)
- [Structured recommendations](data/recommendations.json)
- [Included episodes and source links](data/episodes.json)

An entry is an answer, **not a unique restaurant**: a chef may recommend the same venue for several categories, or name several places in one answer. The list also includes BC neighbourhoods, markets, wineries, cafés and other destinations. General food and drink preferences have been omitted.

## Coverage — incomplete video review

As of November 17, 2026, 99 official episode write-ups were inventoried across ten pages of the publisher’s blog. The published list above is the BC chef/cook and food-business-owner subset, not all 99 guests. Restaurant owners are included regardless of culinary title. Non-owner hospitality professionals and non-BC episodes remain outside this directory.

**Video review is in progress. This is not a claim to cover every episode or everything said on camera.** The initial Instagram session stopped at a login wall; that was resolved when the owner signed in. Expanded publisher lists include off-camera recommendations and retain `publisher_expanded_list` / `videoReviewed: false`. Newly added video-sourced picks are separately marked `video_transcript_and_caption_review`.

**Research update:** the owner subsequently signed in. The visible Reels archive was scrolled to its end: **510 reels**, including unrelated posts. [Reel inventory](data/reel-inventory.json) records that discovery, not 510 reviewed series episodes. Caption classification and speech review are underway. [Video notes](data/video-notes.json) are separately reviewed summaries with time cues; automatic transcripts remain private research cache and are never automatically published as quotes. The expanded-list rows retain their original evidence type.

See [coverage totals](data/coverage.json), [full article inventory](data/episode-inventory.json) and [remaining work](BACKLOG.md). The inventory includes out-of-province episodes for audit purposes; their recommendations are not in the BC list.

## Editorial rules

1. Destination must be in British Columbia, even when the guest is based elsewhere. No Australia, other countries, or other Canadian provinces.
2. Use the publisher’s local-favourites context and linked venues. Explicit outside-BC answers are excluded; mixed answers retain only the BC choice. Chains are not assigned an invented branch.
3. Remove own-venue menu sections and known current workplaces/affiliated restaurants, including self-picks in local-favourites sections. Affiliations are based on episode-time biographies, not a comprehensive current ownership registry.
4. **“Dying to try” is a wish list**, not an endorsement based on a visit. It is tagged separately.
5. Keep citations to the official article and embedded Instagram episode. Article publication date is not assumed to be filming date. Availability, opening status and ownership may since have changed.
6. Correct obvious HTML-induced spacing. Split independently labelled answers that the source placed in one bullet. Do not invent missing picks or quotes.

The affiliation review is recorded in [editorial-review.json](data/editorial-review.json). [Excluded entries](data/excluded.json) and [scope exclusions](data/scope-exclusions.json) provide an audit trail; they are not recommendation lists.

## Reproduce

Requires Python 3 and Beautiful Soup (`python -m pip install -r requirements.txt`).

```sh
python scripts/inventory.py
python scripts/build.py
python scripts/validate.py
```

Raw article responses are cached locally under ignored `.cache/`; they are not committed. New episodes need an editorial-review entry before inclusion. Review regional exceptions and affiliations before rebuilding; the scripts do not automatically establish geography or ownership.

## Run the app

```sh
npm install
python scripts/prepare-map.py
npm run dev
```

Dev uses port 3000. `npm run build` produces `dist/` for Vercel. The Vercel project is `baverages-projects/chefs-fav`, connected to this GitHub repository. `node scripts/ui-smoke.mjs` checks the deployed app at desktop, 390px and 320px widths using locally installed Chrome; set `TEST_URL` for another target. The data checks are `python scripts/validate.py`.

`prepare-map.py` queries Photon sequentially with a delay and caches responses. Weak matches and inappropriate feature types are rejected. Photo crop coordinates in `data/chef-photo-framing.json` are manually checked against episode header photos; images are credited to and served from the publisher. The app contains no Instagram login credentials.

Optional local research: `yt-dlp` and `faster-whisper` power the metadata/transcription scripts. These outputs are **unreviewed** until an editor checks them, corrects named entities against sources and records source-linked notes. Do not publish bulk automatic transcripts.

Source: [Chef’s Favourite](https://chefsfav.com/blog). Independent research index; not an official Chef’s Favourite product.
