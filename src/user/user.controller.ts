import { Controller, Get, Post, Body, Patch, Param, Delete,Query, ParseIntPipe } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @Get()
  findAll() {
    return this.userService.findAll();
  }

  @Get(':id/pets')
  getPetsByUserId(@Param('id',ParseIntPipe) id:number){
    return this.userService.getPetsByUserId(id)
  }

  @Get('search')
    async search(@Query('q') query: string) {
      return this.userService.searchUsers(query);
    }

    
    @Get(':id')
    async findOne(@Param('id') id: string) {
      return this.userService.findOne(+id);
    }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(+id, updateUserDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.userService.deactivate(+id);
  }
}
