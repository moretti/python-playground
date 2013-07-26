import jinja2
import json
import logging
import os
import sys
import urllib
import urllib2
import webapp2

from models import Snippet
import settings

# This fixes a pwd import bug for os.path.expanduser() on the
# dev/production server
os.environ.update({'HOME': settings.PROJECT_DIR})

# Load third-part libraries
libs = ('autopep8', 'pep8')
for lib in libs:
    sys.path.append(os.path.join(os.path.dirname(__file__), 'lib/' + lib))
import autopep8


class Index(webapp2.RequestHandler):

    def get(self, snippet_id=None):
        body = 'print "Hello, playground"\n'
        if snippet_id:
            snippet = Snippet.get_by_id(snippet_id)
            if snippet:
                body = snippet.body
            else:
                self.abort(404)

        template = settings.JINJA_ENVIRONMENT.get_template('index.html')
        self.response.write(template.render({'body': body}))


class Run(webapp2.RequestHandler):

    def post(self):
        body = self.request.get('body')
        data = urllib.urlencode({'body': body})
        response = urllib2.urlopen(
            url=settings.JYTHON_SANDBOX_URL, data=data).read()
        self.response.headers['Content-Type'] = 'application/json'
        self.response.write(response)


class Format(webapp2.RequestHandler):

    def post(self):
        result = {}
        body = self.request.get('body')

        try:
            result['Body'] = autopep8.fix_string(body)
        except Exception as e:
            result['Error'] = str(e)

        self.response.headers['Content-Type'] = 'application/json'
        self.response.write(json.dumps(result))


class Share(webapp2.RequestHandler):

    def post(self):
        body = self.request.get('body')
        key = Snippet.create_key(body)
        snippet = key.get()
        if not snippet:
            snippet = Snippet(key=key, body=body)
            snippet.put()

        self.response.write(snippet.key.id())

app = webapp2.WSGIApplication([
    ('/', Index),
    ('/p/([A-Za-z0-9\.\-_]{10})', Index),
    ('/run', Run),
    ('/fmt', Format),
    ('/share', Share),
], debug=settings.DEBUG)
