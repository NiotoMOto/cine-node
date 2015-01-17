// server.js
// BASE SETUP
// =============================================================================
// call the packages we need
var express = require('express'); // call express
var cors = require('cors');
var _ = require('lodash');
var compress = require('compression');
var http = require('http');
var request = require('request-promise');
var Q = require('q');
var app = express(); // define our app using express
var bodyParser = require('body-parser');
var Sequelize = require('sequelize'),
    sequelize = new Sequelize('movie', 'root', 'elg1024', {
        dialect: "mysql", // or 'sqlite', 'postgres', 'mariadb'
        port: 3306, // or 5432 (for postgres)
    })
sequelize.authenticate().complete(function(err) {
    if (!!err) {
        console.log('Unable to connect to the database:', err)
    } else {
        console.log('Connection has been established successfully.')
    }
})
User = sequelize.define('User', {
    id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    username: Sequelize.STRING
});
Movie = sequelize.define('Movie', {
    id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    imdbId: Sequelize.INTEGER,
    title: Sequelize.STRING
        // , {
        //     moyenne: function() {
        //         requete = 'select avg(viewmovies.note) from movies join viewmovies on movies.id = viewmovies.MovieId where movies.id = ' + this.id;
        //         sequelize.query(requete).success(function(moyenne) {
        //             return moyenne;
        //         })
        //     }
});
ViewMovie = sequelize.define('ViewMovie', {
    id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    note: Sequelize.INTEGER,
    prix: Sequelize.FLOAT,
    date: Sequelize.DATE,
    commentaire: Sequelize.STRING
});
Pays = sequelize.define('Pays', {
    id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    name: Sequelize.STRING,
    iso_3166_1: Sequelize.STRING
});
Historique = sequelize.define('Historique', {
    id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    message: Sequelize.STRING,
    type: Sequelize.STRING
});
Historique.belongsTo(User);
Historique.belongsTo(Movie);
ViewMovie.belongsTo(User);
ViewMovie.belongsTo(Movie);
Movie.hasMany(Pays);
Pays.hasMany(Movie);
User.hasMany(ViewMovie, {
    as: 'views'
});
Movie.hasMany(ViewMovie, {
    as: 'views'
});
// sequelize.sync();
// sequelize.drop().then(function() {
//     var fUser;
//     var fMovie;
//     sequelize.sync({
//         forced: true
//     }).then(function() {
//         User.create({
//             username: 'Johann'
//         });
//         User.create({
//             username: 'Aurelien'
//         });
//         User.create({
//             username: 'Remy'
//         });
//         User.create({
//             username: 'Seb'
//         });
//         return User.create({
//             username: 'Anne'
//         });
//     })
// });
// configure app to use bodyParser()
// this will let us get the data from a POST
app.use(compress());
app.use(bodyParser());
app.use(cors());
var port = process.env.PORT || 8080; // set our port
var router = express.Router();
router.get('/', function(req, res) {
    res.json({
        message: 'hooray! welcome to our api!'
    });
});
router.get('/movies', function(req, res) {
    var limit = req.query.limit;
    var query = req.query.query;
    if (!query) {
        Movie.findAll({
            limit: limit
        }).then(function(movies) {
            res.json(movies);
        });
    } else {
        Movie.find({
            where: {
                imdbId: query
            }
        }).then(function(movies) {
            if (movies != null) {
                var result = [];
                result.push(movies.dataValues);
                res.json(result);
            } else {
                movies = [];
                res.json(movies);
            }
        });
    }
});
router.get('/movies/rank', function(req, res) {
    var limit = req.query.limit || 10;
    var order = req.query.order || '';
    var requete = "select AVG(vm.note) moyenne, m.id, m.title, COUNT(vm.id) as totalVotes from Movies as m right join ViewMovies as vm  on m.id = vm.MovieId WHERE vm.note IS NOT NULL group by m.id having count(vm.note) > 2  ORDER BY moyenne " + order + ' limit ' + limit;
    sequelize.query(requete, null, {
        raw: 'true'
    }).success(function(Movies) {
        var response = {};
        response.elements = Movies;
        res.send(response);
    })
});
router.get('/movies/countries', function(req, res) {
    var paysStats = {};
    var callbackCounter = 0;
    var response = {};
    var paysMovie = {}
    Movie.findAll({
        include: [Pays]
    }).then(function(movies) {
        _.forEach(movies, function(value, key) {
            _.forEach(value.Pays, function(pays, key) {
                var paysel = paysStats[pays.iso_3166_1];
                if (!paysel) {
                    paysStats[pays.iso_3166_1] = 1;
                } else {
                    paysStats[pays.iso_3166_1] = paysel + 1;
                }
                if (!paysMovie[pays.iso_3166_1]) {
                    paysMovie[pays.iso_3166_1] = [];
                }
                paysMovie[pays.iso_3166_1].push(value)
            });
            callbackCounter++;
            if (callbackCounter === movies.length) {
                response.elements = {};
                response.elements.stats = paysStats;
                response.elements.movies = paysMovie;
                res.send(response);
            }
        });
    })
});
router.get('/movie/:id', function(req, res) {
    var id = req.params.id;
    Movie.find({
        where: {
            id: id
        }
    }).then(function(movie) {
        res.json(movie);
    });
});
// router.get('/movies/sync', function(req, res) {
//     var id = req.params.id;
//     Movie.findAll().then(function(movies) {
//         _.forEach(movies, function(movie, key) {
//             movie.getPays().success(function(payss) {
//                 if (!payss.dataValues) {
//                     request('https://api.themoviedb.org/3/movie/' + movie.imdbId + '?api_key=6c004d34d854c2effb7f697045aea2bd&language=fr', function(error, resp, body) {
//                         var json = JSON.parse(body);
//                         _.forEach(json.production_countries, function(pays, key) {
//                             Pays.find({
//                                 where: {
//                                     iso_3166_1: pays.iso_3166_1
//                                 }
//                             }).then(function(data) {
//                                 if (!data) {
//                                     var p = {};
//                                     p.iso_3166_1 = pays.iso_3166_1;
//                                     p.name = pays.name;
//                                     p = Pays.build(p);
//                                     p.save(p).then(function(pResult) {
//                                         movie.addPays(pResult);
//                                     });
//                                 } else {
//                                     movie.addPays(data);
//                                 }
//                             })
//                         })
//                     });
//                 }
//             });
//         })
//     })
// });
router.get('/movie/:id/note', function(req, res) {
    var id = req.params.id;
    var note = 0;
    var nbNote = 0;
    var moyenne = 0;
    var commSize = 0;
    ViewMovie.findAll({
        where: {
            MovieId: id
        }
    }).then(function(viewMovies) {
        _.forEach(viewMovies, function(viewMovie) {
            if (_.isNumber(viewMovie.note)) {
                note += viewMovie.note;
                nbNote++;
            }
        });
        if (note) {
            moyenne = note / nbNote;
        }
        var response = {};
        response.moyenne = moyenne;
        response.count = nbNote;
        response.commSize = commSize;
        res.json(response);
    });
});


router.post('/movies/search', function(req, res) {
    var requete = req.body;
    var callbackCounter = 0;
    var response = {};
    var promises = [];
    var movies = [];
    Movie.findAll({
        where: requete.filter,
        limit: requete.limit || 10,
        offset: requete.offset || 0
    }).then(function(data) {
        movies = data;
        _.forEach(movies, function(movie, key) {
            var k = key;
            promises.push(request('https://api.themoviedb.org/3/movie/' + movie.imdbId + '?api_key=6c004d34d854c2effb7f697045aea2bd&language=fr').then(function(body, err) {
              console.log(movies[k].dataValues);
                movies[k].dataValues.imdbMovie = JSON.parse(body);
            }));
        });
        console.log(promises.length);

        Q.all(promises).done(function() {
            console.log('finish');
            response.elements = movies;
            res.json(response);
        })
    });
});


router.post('/movie', function(req, res) {
    var movie = req.body.movie;
    movie = Movie.build(movie);
    movie.save().then(function(movie) {
        request('https://api.themoviedb.org/3/movie/' + movie.imdbId + '?api_key=6c004d34d854c2effb7f697045aea2bd&language=fr', function(error, resp, body) {
            var json = JSON.parse(body);
            _.forEach(json.production_countries, function(pays, key) {
                Pays.find({
                    where: {
                        iso_3166_1: pays.iso_3166_1
                    }
                }).then(function(data) {
                    if (!data) {
                        var p = {};
                        p.iso_3166_1 = pays.iso_3166_1;
                        p.name = pays.name;
                        p = Pays.build(p);
                        p.save(p).then(function(pResult) {
                            movie.addPays(pResult);
                        });
                    } else {
                        movie.addPays(data);
                    }
                })
            })
        });
        res.json(movie);
    });
});
router.delete('/movie/:id', function(req, res, next) {
    var id = req.params.id;
    Movie.find({
        where: {
            id: id
        }
    }).then(function(movie) {
        movie.destroy();
        res.json({
            'message': 'Suppression réussie'
        })
    });
});
router.put('/movie', function(req, res) {
    var movieJson = req.body.movie;
    Movie.find({
        where: {
            id: movieJson.id
        }
    }).then(function(movie) {
        if (movie) {
            movie.updateAttributes(movieJson).then(function(movie) {
                res.json(movie);
            });
        }
    });
});
router.get('/users', function(req, res, next) {
    var includes = req.query.includes;
    if (includes === 'views') {
        include = [{
            model: ViewMovie,
            as: 'views'
        }];
    } else {
        include = []
    }
    User.findAll({
        include: include
    }).then(function(user) {
        res.json(user);
    });
});
router.get('/user/:id', function(req, res, next) {
    var id = req.params.id;
    User.find({
        where: {
            id: id
        }
    }).then(function(user) {
        res.json(user);
    });
});
router.get('/user/:id/note', function(req, res) {
    var id = req.params.id;
    var note = 0;
    var nbNote = 0;
    var moyenne = 0;
    var notesEach = [];
    var commSize = 0;
    for (var i = 0; i < 11; i++) {
        notesEach[i] = 0;
    }
    ViewMovie.findAll({
        where: {
            UserId: id
        }
    }).then(function(viewMovies) {
        _.forEach(viewMovies, function(viewMovie) {
            if (_.isNumber(viewMovie.note)) {
                notesEach[viewMovie.note] ++;
                note += viewMovie.note;
                nbNote++;
                if (viewMovie.commentaire) {
                    commSize += viewMovie.commentaire.length;
                }
            }
        });
        if (_.isNumber(note)) {
            moyenne = note / nbNote;
        }
        var response = {};
        response.moyenne = moyenne;
        response.count = nbNote;
        response.noteTab = notesEach;
        response.commSize = commSize;
        res.json(response);
    });
});
router.delete('/user/:id', function(req, res, next) {
    var id = req.params.id;
    User.find({
        where: {
            id: id
        }
    }).then(function(user) {
        user.destroy();
        res.json({
            'message': 'Suppression réussie'
        })
    });
});
router.post('/user', function(req, res, next) {
    var user = req.body.user;
    user = User.build(user);
    user.save().then(function(user) {
        res.json(user);
    });
});
router.put('/user', function(req, res, next) {
    var userJson = req.body.user;
    User.find({
        where: {
            id: userJson.id
        }
    }).then(function(user) {
        if (user) {
            user.updateAttributes(userJson).then(function(user) {
                res.json(user);
            });
        }
    });
});
router.get('/viewMovies', function(req, res, next) {
    var filter = req.query.filter;
    var movie = req.query.movie;
    var user = req.query.user;
    var order = req.query.order;
    var group = req.query.group;
    console.log('query limitr', req.query.limit);
    var limit = req.query.limit || null;
    console.log('LIMIT : ', limit);
    if (filter) {
        var cond = {};
        if (movie) {
            cond.MovieId = movie;
        }
        if (user) {
            cond.UserId = user;
        }
        ViewMovie.findAll({
            limit: limit,
            group: group,
            where: cond,
            order: order,
            include: [User, Movie]
        }).then(function(viewMovie) {
            res.json(viewMovie);
        });
    } else {
        ViewMovie.findAll({
            limit: limit,
            group: group,
            order: order,
            include: [User, Movie]
        }).then(function(viewMovie) {
            res.json(viewMovie);
        });
    }
});
router.get('/viewMovie/:id', function(req, res, next) {
    var id = req.params.id;
    ViewMovie.find({
        where: {
            id: id
        }
    }).then(function(viewMovie) {
        res.json(viewMovie);
    });
});
router.delete('/viewMovie/:id', function(req, res, next) {
    var id = req.params.id;
    ViewMovie.find({
        where: {
            id: id
        }
    }).then(function(viewMovie) {
        viewMovie.destroy();
        res.json({
            'message': 'Suppression réussie'
        })
    });
});
router.post('/viewMovie', function(req, res, next) {
    var viewMovie = ViewMovie.build(req.body.viewMovie);
    var user = User.build(req.body.user);
    var movie = Movie.build(req.body.movie);
    viewMovie.save().then(function(viewMovie) {
        viewMovie.setUser(user);
        viewMovie.setMovie(movie);
        res.json(viewMovie);
    });
});
router.put('/viewMovie', function(req, res, next) {
    var viewMovieJson = req.body.viewMovie;
    var user = req.body.user;
    var movie = req.body.movie;
    ViewMovie.find({
        where: {
            id: viewMovieJson.id
        }
    }).then(function(viewMovie) {
        if (viewMovie) {
            viewMovie.updateAttributes(viewMovieJson).then(function(viewMovie) {
                if (user) {
                    viewMovie.setUser(User.build(req.body.user));
                }
                if (movie) {
                    viewMovie.setMovie(Movie.build(req.body.movie));
                }
                res.json(viewMovie);
            });
        }
    });
});
router.get('/historiques', function(req, res, next) {
    var filter = req.query.filter;
    var movie = req.query.movie;
    var user = req.query.user;
    if (filter) {
        var cond = {};
        if (movie) {
            cond.MovieId = movie;
        }
        if (user) {
            cond.UserId = user;
        }
        Historique.findAll({
            where: cond,
            include: [User, Movie],
            limit: 20,
            order: 'createdAt DESC'
        }).then(function(historique) {
            res.json(historique);
        });
    } else {
        Historique.findAll({
            include: [User, Movie],
            limit: 20,
            order: 'createdAt DESC'
        }).then(function(historique) {
            res.json(historique);
        });
    }
});
router.get('/historique/:id', function(req, res, next) {
    var id = req.params.id;
    Historique.find({
        where: {
            id: id
        }
    }).then(function(historique) {
        res.json(historique);
    });
});
router.delete('/historique/:id', function(req, res, next) {
    var id = req.params.id;
    Historique.find({
        where: {
            id: id
        }
    }).then(function(historique) {
        historique.destroy();
        res.json({
            'message': 'Suppression réussie'
        })
    });
});
router.post('/historique', function(req, res, next) {
    var historique = Historique.build(req.body.historique);
    var user = User.build(req.body.user);
    var movie = Movie.build(req.body.movie);
    historique.save().then(function(historique) {
        historique.setUser(user);
        historique.setMovie(movie);
        res.json(historique);
    });
});
router.put('/historique', function(req, res, next) {
    var historiqueJson = req.body.historique;
    var user = req.body.user;
    var movie = req.body.movie;
    Historique.find({
        where: {
            id: historiqueJson.id
        }
    }).then(function(historique) {
        if (historique) {
            historique.updateAttributes(historiqueJson).then(function(historique) {
                if (user) {
                    historique.setUser(User.build(req.body.user));
                }
                if (movie) {
                    historique.setMovie(Movie.build(req.body.movie));
                }
                res.json(historique);
            });
        }
    });
});
app.use('/api', router);
app.listen(port);
console.log('Magic happens on port ' + port);