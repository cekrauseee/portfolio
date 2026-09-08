---
slug: portfolio
name: cekrause/portfolio
repositoryUrl: https://github.com/cekrauseee/portfolio
description: a place to share my projects and talk about work.
metaDescription: >-
  my software engineering portfolio, with project notes, a tool for comparing
  roles, meeting scheduling, and a visitor guestbook on a globe.
summary: >-
  i built my portfolio around project notes kept in their own repositories and
  collected from github during the build. it also has a tool for comparing roles
  with the published work and experience, calendar and meet scheduling, and a
  moderated guestbook on an interactive globe.
highlights:
  - project notes kept with their source
  - expandable projects in three languages
  - role comparison and meeting scheduling
  - a visitor guestbook on a globe
---

i built this site to give my projects a home and some room to explain them. the
page stays simple: a narrow column, text links, and project notes that open where
you are.

## keeping it easy to update

each project keeps its copy in a `.portfolio` folder inside its own repository.
the site collects those files from github during the build, so adding another
project follows the same process as updating one that's already here.

the files use markdown, with room for images and separate translations. the site
supports english, portuguese, and japanese.

## a few ways to interact

you can compare a role description with my published work and experience or book
a conversation through my calendar. scheduling checks availability and sends an
invitation with a google meet link.

i also worked through what happens when a booking request is interrupted or sent
again, so a retry can recover the original meeting without creating another one.

the guestbook is a more playful part of the site. visitors can leave a note that
appears as a point of light on a globe. messages are moderated before they appear,
and the public forms have usage limits.
