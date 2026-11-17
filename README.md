# Chef’s Favourite — British Columbia

A sourced starting list of **British Columbia destinations recommended by chefs and cooks** in Chef’s Favourite’s **Mates on Crates** series, excluding their own restaurants, current workplaces and known affiliated venues.

## Read the list

- **[Chef-by-chef recommendations](CHEFS.md)** — 307 category/answer entries from 23 episode write-ups.
- [Spreadsheet CSV](data/recommendations.csv)
- [Structured recommendations](data/recommendations.json)
- [Included episodes and source links](data/episodes.json)

An entry is an answer, **not a unique restaurant**: a chef may recommend the same venue for several categories, or name several places in one answer. The list also includes BC neighbourhoods, markets, wineries, cafés and other destinations. General food and drink preferences have been omitted.

## Coverage — incomplete video review

As of November 17, 2026, 99 official episode write-ups were inventoried across ten pages of the publisher’s blog. The published list above is the BC chef/cook subset, not all 99 guests: other guests include bartenders, owners and hospitality professionals whose biographies do not explicitly establish a culinary role.

**No videos have yet been reviewed. This is not a claim to cover every episode or everything said on camera.** Instagram’s unauthenticated profile stopped at a login wall. The publisher’s expanded lists include off-camera recommendations; each row is explicitly tagged `publisher_expanded_list` and `videoReviewed: false`.

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

Source: [Chef’s Favourite](https://chefsfav.com/blog). Independent research index; not an official Chef’s Favourite product.
