-- Real thumbnails for uploaded stories (Section 2 create flow already
-- captures a still frame client-side — see captureVideoThumbnail in
-- MyStories.jsx — but had nowhere to persist it). Link-type stories don't
-- need a column: their thumbnail is derived from the YouTube video id at
-- render time (see getYouTubeThumbnailUrl in utils/helpers.js).
alter table user_stories add column thumbnail_url text;
