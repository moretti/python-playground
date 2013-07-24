import jinja2
import logging
import os
import urllib
import urllib2
import webapp2


JINJA_ENVIRONMENT = jinja2.Environment(
    loader=jinja2.FileSystemLoader(os.path.dirname(__file__)),
    extensions=['jinja2.ext.autoescape'])

JYTHON_SANDBOX_URL = 'http://jy-sandbox.appspot.com/sandbox'

class Index(webapp2.RequestHandler):
    def get(self):
        template_values = {'body': 'print "Hello, playground"'}
        template = JINJA_ENVIRONMENT.get_template('index.html')
        self.response.write(template.render(template_values))

class Run(webapp2.RequestHandler):
    def post(self):
        body = self.request.get('body')
        data = urllib.urlencode({'body': body})
        response = urllib2.urlopen(url=JYTHON_SANDBOX_URL, data=data).read()
        logging.info(response)
        self.response.headers['Content-Type'] = 'application/json'
        self.response.write(response)


app = webapp2.WSGIApplication([
    ('/', Index),
    ('/run', Run),
], debug=True)
