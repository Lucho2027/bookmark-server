const path = require("path")
const express = require("express")
const xss = require("xss")
const logger = require("../logger")
const BookmarksService = require("./bookmarks-service")
const { getBookmarkValidationError } = require("./bookmark-validator")

const bookmarksRouter = express.Router()
const bodyParser = express.json()

const serializeBookmark = bookmark => ({
	id: bookmark.id,
	name: xss(bookmark.name),
	url: bookmark.url,
	description: xss(bookmark.description),
	rating: Number(bookmark.rating)
})

bookmarksRouter
	.route("/")

	.get((req, res, next) => {
		BookmarksService.getAllBookmarks(req.app.get("db"))
			.then(bookmarks => {
				res.json(bookmarks.map(serializeBookmark))
			})
			.catch(next)
	})

	.post(bodyParser, (req, res, next) => {
		const { name, url, description, rating } = req.body
		const newBookmark = { name, url, description, rating }

		for (const field of ["name", "url", "rating"]) {
			if (!newBookmark[field]) {
				logger.error(`${field} is required`)
				return res.status(400).send({
					error: { message: `'${field}' is required` }
				})
			}
		}

		const error = getBookmarkValidationError(newBookmark)

		if (error) return res.status(400).send(error)

		BookmarksService.insertBookmark(req.app.get("db"), newBookmark)
			.then(bookmark => {
				logger.info(`Bookmark with id ${bookmark.id} created.`)
				res
					.status(201)
					.location(path.posix.join(req.originalUrl, `${bookmark.id}`))
					.json(serializeBookmark(bookmark))
			})
			.catch(next)
	})

bookmarksRouter
	.route("/:id")

	.all((req, res, next) => {
		const { id } = req.params
		BookmarksService.getById(req.app.get("db"), id)
			.then(bookmark => {
				if (!bookmark) {
					logger.error(`Bookmark with id ${id} not found.`)
					return res.status(404).json({
						error: { message: `Bookmark Not Found` }
					})
				}

				res.bookmark = bookmark
				next()
			})
			.catch(next)
	})

	.get((req, res) => {
		res.json(serializeBookmark(res.bookmark))
	})

	.delete((req, res, next) => {
		const { id } = req.params
		BookmarksService.deleteBookmark(req.app.get("db"), id)
			.then(numRowsAffected => {
				logger.info(`Bookmark with id ${id} deleted.`)
				res.status(204).end()
			})
			.catch(next)
	})

	.patch(bodyParser, (req, res, next) => {
		const { name, url, description, rating } = req.body
		const bookmarkToUpdate = { name, url, description, rating }

		const numberOfValues = Object.values(bookmarkToUpdate).filter(Boolean)
			.length
		if (numberOfValues === 0) {
			logger.error(`Invalid update without required fields`)
			return res.status(400).json({
				error: {
					message: `Request body must content either 'name', 'url', 'description' or 'rating'`
				}
			})
		}

		const error = getBookmarkValidationError(bookmarkToUpdate)

		if (error) return res.status(400).send(error)

		BookmarksService.updateBookmark(
			req.app.get("db"),
			req.params.id,
			bookmarkToUpdate
		)
			.then(numRowsAffected => {
				res.status(204).end()
			})
			.catch(next)
	})

module.exports = bookmarksRouter
