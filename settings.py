import os
import jinja2

SALT = 'my_secret_salt'

DEBUG = os.environ['SERVER_SOFTWARE'].startswith('Dev')

PROJECT_DIR = os.path.abspath(os.path.dirname(os.path.dirname(__file__)))

JINJA_ENVIRONMENT = jinja2.Environment(
    loader=jinja2.FileSystemLoader(os.path.dirname(__file__)),
    extensions=['jinja2.ext.autoescape'])

JYTHON_SANDBOX_URL = 'http://jy-sandbox.appspot.com/sandbox'
